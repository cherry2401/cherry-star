import { Router, Response } from 'express';
import { authRequired, AuthRequest } from '../middleware/auth.js';
import { baostarApi, getCachedPrices } from './services.js';
import { query, getClient } from '../database/index.js';

const router = Router();

// ============================================
// POST /api/orders — Buy a service (auth required)
// ============================================
router.post('/', authRequired, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { service_id, endpoint, object_id, package_name, display_name, quantity, object_type, list_message, num_minutes, num_day, slbv, fb_name } = req.body;

    if (!service_id || !endpoint || typeof object_id !== 'string' || !package_name) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin đơn hàng hoặc định dạng sai' });
        return;
    }

    // Sanitize object_id
    const cleanObjectId = object_id.trim();
    if (cleanObjectId.length === 0 || cleanObjectId.length > 500) {
        res.status(400).json({ success: false, message: 'Link/ID không hợp lệ hoặc quá dài' });
        return;
    }
    if (/<[a-z][\s\S]*>/i.test(cleanObjectId)) {
        res.status(400).json({ success: false, message: 'Link/ID không được chứa thẻ HTML' });
        return;
    }

    // 1. Get markup for this service
    const pricingResult = await query('SELECT markup FROM pricing_config WHERE service_id = $1', [service_id]);
    const markup = pricingResult.rows[0]?.markup || 1.5;

    // 2. Get package price (from cache)
    let costPrice: number;
    try {
        const { data: pricesData } = await getCachedPrices();
        const servicePath = endpoint.replace('/api/', '/').replace('/buy', '');
        const category = pricesData.data.find((c: any) => c.path === servicePath);
        const pkg = category?.package?.find((p: any) => p.package_name === package_name);
        if (!pkg) {
            res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại' });
            return;
        }
        costPrice = pkg.price_per;
    } catch {
        res.status(500).json({ success: false, message: 'Không thể lấy giá gói dịch vụ' });
        return;
    }

    // 2b. Check for per-package fixed price or markup override
    const pkgPricingResult = await query(
        'SELECT markup, fixed_price FROM package_pricing WHERE service_id = $1 AND package_name = $2 AND original_price = $3',
        [service_id, package_name, costPrice]
    );
    const pkgPricing = pkgPricingResult.rows[0];
    const effectiveMarkup = pkgPricing?.markup ?? markup;
    const fixedPrice = pkgPricing?.fixed_price ?? null;

    // 3. Calculate sell price
    const qty = quantity || 1;
    let totalCost: number;
    let totalSell: number;

    if (service_id === 'vip') {
        const days = num_day || 30;
        const slbvVal = parseInt(slbv || '5');
        const multiplier = slbvVal / 5;
        const isClone = /clone|^s\\d/i.test(package_name);
        if (isClone) {
            totalCost = costPrice * qty * days * multiplier;
        } else {
            totalCost = costPrice * days;
        }
    } else if (service_id === 'instagram-vip-like') {
        const days = num_day || 30;
        totalCost = costPrice * qty * days;
    } else {
        totalCost = costPrice * qty;
    }

    // Use fixed_price if set, otherwise calculate from markup
    if (fixedPrice !== null) {
        totalSell = fixedPrice * qty;
    } else {
        totalSell = Math.ceil(totalCost * effectiveMarkup);
    }

    // 4. Check if admin (bypass balance check)
    const userResult = await query('SELECT balance, role FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        // Regular user: check balance
        if (user.balance < totalSell) {
            res.status(400).json({
                success: false,
                message: `Số dư không đủ. Cần ${totalSell.toLocaleString()}đ, còn ${user.balance.toLocaleString()}đ`,
            });
            return;
        }

        // 5. Deduct balance (atomic transaction)
        const newBalance = user.balance - totalSell;
        const client = await getClient();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, description, metadata)
                 VALUES ($1, 'purchase', $2, $3, $4, $5)`,
                [userId, -totalSell, newBalance, `Mua ${package_name}`, JSON.stringify({ service_id, package_name, object_id })]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // 6. Call BaoStar API
    try {
        const buyBody: any = { object_id, package_name };
        if (quantity) buyBody.quantity = quantity;
        if (object_type) buyBody.object_type = object_type;
        if (list_message) buyBody.list_message = list_message;
        if (num_minutes) buyBody.num_minutes = num_minutes;
        if (num_day) buyBody.num_day = num_day;
        if (slbv) buyBody.slbv = slbv;
        if (fb_name) buyBody.fb_name = fb_name;

        const { data: baostarRes } = await baostarApi.post(endpoint, buyBody);

        if (baostarRes.success) {
            // Save order
            const orderSellPrice = isAdmin ? 0 : totalSell;
            const orderProfit = isAdmin ? 0 : totalSell - totalCost;
            await query(
                `INSERT INTO orders (user_id, baostar_order_id, service_id, package_name, display_name, object_id, quantity, sell_price, cost_price, profit, status, request_data)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'processing', $11)`,
                [userId, baostarRes.data?.id || null, service_id, package_name, display_name || package_name, object_id, qty, orderSellPrice, totalCost, orderProfit, JSON.stringify(buyBody)]
            );

            res.json({
                success: true,
                message: baostarRes.message || 'Đặt hàng thành công!',
                data: { order_id: baostarRes.data?.id, amount: isAdmin ? 0 : totalSell, balance: user.balance },
            });
        } else {
            // BaoStar failed → Refund (only for non-admin)
            if (!isAdmin) await refundUser(userId, totalSell, `Hoàn tiền: ${baostarRes.message || 'Lỗi BaoStar'}`);
            res.status(400).json({
                success: false,
                message: baostarRes.message || 'Lỗi từ nhà cung cấp' + (isAdmin ? '' : ', đã hoàn tiền'),
            });
        }
    } catch (err: any) {
        // Network error → Refund (only for non-admin)
        if (!isAdmin) await refundUser(userId, totalSell, 'Hoàn tiền: Lỗi kết nối nhà cung cấp');
        res.status(500).json({
            success: false,
            message: 'Lỗi kết nối nhà cung cấp' + (isAdmin ? '' : ', đã hoàn tiền'),
        });
    }
});

// ============================================
// GET /api/orders/stats — User's order statistics
// ============================================
router.get('/stats', authRequired, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const totals = (await query(`
        SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(sell_price), 0) as total_spent,
            COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed_orders
        FROM orders WHERE user_id = $1
    `, [userId])).rows[0];

    const totalDeposits = (await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions WHERE user_id = $1 AND type = 'deposit'
    `, [userId])).rows[0];

    const totalRefunds = (await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions WHERE user_id = $1 AND type = 'refund'
    `, [userId])).rows[0];

    const byService = (await query(`
        SELECT service_id, package_name, COUNT(*) as count, SUM(sell_price) as total_price
        FROM orders WHERE user_id = $1
        GROUP BY service_id, package_name
        ORDER BY total_price DESC
    `, [userId])).rows;

    res.json({
        success: true,
        data: {
            total_orders: parseInt(totals.total_orders),
            total_spent: parseInt(totals.total_spent),
            total_deposits: parseInt(totalDeposits.total),
            total_refunds: parseInt(totalRefunds.total),
            failed_orders: parseInt(totals.failed_orders),
            by_service: byService,
        },
    });
});

// ============================================
// GET /api/orders — User's orders (paginated, filterable)
// ============================================
router.get('/', authRequired, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const serviceId = req.query.service_id as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    let where = 'user_id = $1';
    const params: any[] = [userId];
    let paramIdx = 2;

    if (serviceId) { where += ` AND service_id = $${paramIdx++}`; params.push(serviceId); }
    if (status) { where += ` AND status = $${paramIdx++}`; params.push(status); }

    const total = parseInt((await query(
        `SELECT COUNT(*) as count FROM orders WHERE ${where}`, params
    )).rows[0].count);

    const result = await query(
        `SELECT id, baostar_order_id, service_id, package_name, display_name, object_id, quantity,
                sell_price, status, created_at
         FROM orders WHERE ${where}
         ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, limit, offset]
    );

    res.json({
        success: true,
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

// ============================================
// Helper: Refund user on BaoStar failure
// ============================================
async function refundUser(userId: number, amount: number, description: string) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const userResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const newBalance = userResult.rows[0].balance + amount;
        await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);
        await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_after, description)
             VALUES ($1, 'refund', $2, $3, $4)`,
            [userId, amount, newBalance, description]
        );
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export default router;
