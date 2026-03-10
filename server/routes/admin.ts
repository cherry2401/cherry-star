import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authRequired, adminRequired, AuthRequest } from '../middleware/auth.js';
import { query, getClient } from '../database/index.js';
import { serviceMap } from '../serviceMap.js';
import { baostarApi } from './services.js';
import type { DbPricingConfig, DbHiddenPackage, DbPackagePricing } from '../types.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authRequired as any, adminRequired as any);

// ============================================
// Helper: Log admin action for audit trail
// ============================================
async function logAdminAction(
    req: AuthRequest,
    action: string,
    targetType: string | null,
    targetId: string | null,
    details: Record<string, any> = {}
) {
    try {
        const ip = req.headers['x-forwarded-for'] as string || req.ip || '';
        await query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user!.id, action, targetType, targetId, JSON.stringify(details), ip]
        );
    } catch (err) {
        console.error('[AuditLog] Failed to write:', err);
    }
}

// ============================================
// GET /admin/stats — Dashboard statistics
// ============================================
router.get('/stats', async (_req: AuthRequest, res: Response) => {
    const totalUsers = (await query('SELECT COUNT(*) as count FROM users')).rows[0].count;
    const totalOrders = (await query('SELECT COUNT(*) as count FROM orders')).rows[0].count;
    const totalRevenue = (await query('SELECT COALESCE(SUM(sell_price), 0) as total FROM orders')).rows[0].total;
    const totalProfit = (await query('SELECT COALESCE(SUM(profit), 0) as total FROM orders')).rows[0].total;
    const totalDeposits = (await query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit'")).rows[0].total;

    // Extended operational metrics
    const ordersToday = (await query("SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE")).rows[0].count;
    const ordersThisWeek = (await query("SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'")).rows[0].count;
    const failedOrders = (await query("SELECT COUNT(*) as count FROM orders WHERE status = 'failed'")).rows[0].count;
    const activeUsers7d = (await query("SELECT COUNT(*) as count FROM users WHERE last_login_at >= NOW() - INTERVAL '7 days'")).rows[0].count;

    const failedRate = parseInt(totalOrders) > 0
        ? Math.round((parseInt(failedOrders) / parseInt(totalOrders)) * 100)
        : 0;

    res.json({
        success: true,
        data: {
            totalUsers: parseInt(totalUsers),
            totalOrders: parseInt(totalOrders),
            totalRevenue: parseInt(totalRevenue),
            totalProfit: parseInt(totalProfit),
            totalDeposits: parseInt(totalDeposits),
            ordersToday: parseInt(ordersToday),
            ordersThisWeek: parseInt(ordersThisWeek),
            failedRate,
            activeUsers7d: parseInt(activeUsers7d),
        },
    });
});

// ============================================
// GET /admin/stats/chart — Chart data (daily aggregated)
// ============================================
router.get('/stats/chart', async (req: AuthRequest, res: Response) => {
    const range = (req.query.range as string) || '7d';
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;

    const rows = (await query(`
        WITH dates AS (
            SELECT generate_series(
                CURRENT_DATE - ($1 || ' days')::INTERVAL,
                CURRENT_DATE,
                '1 day'::INTERVAL
            )::DATE as d
        )
        SELECT
            dates.d::TEXT as date,
            COALESCE(rev.revenue, 0) as revenue,
            COALESCE(rev.orders, 0) as orders,
            COALESCE(dep.deposits, 0) as deposits
        FROM dates
        LEFT JOIN (
            SELECT created_at::DATE as d, SUM(sell_price) as revenue, COUNT(*) as orders
            FROM orders GROUP BY created_at::DATE
        ) rev ON rev.d = dates.d
        LEFT JOIN (
            SELECT created_at::DATE as d, SUM(amount) as deposits
            FROM transactions WHERE type = 'deposit' GROUP BY created_at::DATE
        ) dep ON dep.d = dates.d
        ORDER BY dates.d
    `, [days])).rows;

    res.json({ success: true, data: rows });
});

// ============================================
// GET /admin/users — List all users
// ============================================
router.get('/users', async (req: AuthRequest, res: Response) => {
    const search = req.query.search as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let total: number;
    let users;

    if (search) {
        const searchPattern = `%${search}%`;
        total = parseInt((await query(
            `SELECT COUNT(*) as count FROM users
             WHERE username LIKE $1 OR email LIKE $2 OR phone LIKE $3`,
            [searchPattern, searchPattern, searchPattern]
        )).rows[0].count);

        users = (await query(
            `SELECT u.id, u.username, u.email, u.phone, u.display_name, u.balance, u.role,
                    u.is_active, u.created_at, u.last_login_at,
                    COALESCE(os.total_orders, 0) as total_orders,
                    COALESCE(os.total_spent, 0) as total_spent
             FROM users u
             LEFT JOIN (
                 SELECT user_id, COUNT(*) as total_orders, SUM(sell_price) as total_spent
                 FROM orders GROUP BY user_id
             ) os ON os.user_id = u.id
             WHERE u.username LIKE $1 OR u.email LIKE $2 OR u.phone LIKE $3
             ORDER BY u.created_at DESC LIMIT $4 OFFSET $5`,
            [searchPattern, searchPattern, searchPattern, limit, offset]
        )).rows;
    } else {
        total = parseInt((await query('SELECT COUNT(*) as count FROM users')).rows[0].count);
        users = (await query(
            `SELECT u.id, u.username, u.email, u.phone, u.display_name, u.balance, u.role,
                    u.is_active, u.created_at, u.last_login_at,
                    COALESCE(os.total_orders, 0) as total_orders,
                    COALESCE(os.total_spent, 0) as total_spent
             FROM users u
             LEFT JOIN (
                 SELECT user_id, COUNT(*) as total_orders, SUM(sell_price) as total_spent
                 FROM orders GROUP BY user_id
             ) os ON os.user_id = u.id
             ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        )).rows;
    }

    res.json({ success: true, data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ============================================
// POST /admin/deposit — Add balance to user
// ============================================
router.post('/deposit', async (req: AuthRequest, res: Response) => {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount || amount <= 0) {
        res.status(400).json({ success: false, message: 'user_id và amount > 0 là bắt buộc' });
        return;
    }

    const userResult = await query('SELECT id, username, balance FROM users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];
    if (!user) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }

    const newBalance = user.balance + amount;
    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user_id]);
        const txnResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_after, description)
             VALUES ($1, 'deposit', $2, $3, 'Processing...') RETURNING id`,
            [user_id, amount, newBalance]
        );
        const txnId = txnResult.rows[0].id;
        const finalDesc = `Hệ thống nạp tiền thành công với số tiền ${amount.toLocaleString('vi-VN')}đ mã giao dịch ${txnId}`;
        await client.query('UPDATE transactions SET description = $1 WHERE id = $2', [finalDesc, txnId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    await logAdminAction(req, 'deposit', 'user', String(user_id), { username: user.username, amount, old_balance: user.balance, new_balance: newBalance, description });

    res.json({
        success: true,
        message: `Đã nạp ${amount.toLocaleString()}đ cho ${user.username}`,
        data: { user_id, new_balance: newBalance },
    });
});

// ============================================
// GET /admin/deposit-history — List all deposit transactions
// ============================================
router.get('/deposit-history', async (req: AuthRequest, res: Response) => {
    try {
        const from = req.query.from as string || '';
        const to = req.query.to as string || '';
        const user = req.query.user as string || '';

        let where = "t.type = 'deposit'";
        const params: any[] = [];
        let paramIdx = 1;

        if (from) { where += ` AND t.created_at >= $${paramIdx++}`; params.push(from); }
        if (to) { where += ` AND t.created_at <= $${paramIdx++}`; params.push(to + ' 23:59:59'); }
        if (user) { where += ` AND u.username LIKE $${paramIdx++}`; params.push(`%${user}%`); }

        const deposits = (await query(`
            SELECT t.id, t.created_at, t.amount, t.balance_after, t.description, u.username
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE ${where}
            ORDER BY t.created_at DESC
            LIMIT 200
        `, params)).rows;

        res.json({ success: true, data: deposits });
    } catch (error) {
        console.error('Error fetching deposit history:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử nạp' });
    }
});

// ============================================
// PUT /admin/users/:id — Toggle active / change role
// ============================================
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { is_active, role, password } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (is_active !== undefined) { updates.push(`is_active = $${paramIdx++}`); values.push(is_active ? true : false); }
    if (role) { updates.push(`role = $${paramIdx++}`); values.push(role); }
    if (password) { updates.push(`password_hash = $${paramIdx++}`); values.push(await bcrypt.hash(password, 10)); }

    if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'Không có gì để cập nhật' });
        return;
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values);

    await logAdminAction(req, is_active !== undefined ? (is_active ? 'enable_user' : 'disable_user') : 'update_user', 'user', String(id), { is_active, role, password_changed: !!password });

    res.json({ success: true, message: 'Cập nhật thành công' });
});

// ============================================
// DELETE /admin/users/:id — Delete a user
// ============================================
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id as string);

    // Prevent deleting yourself
    if (userId === req.user!.id) {
        res.status(400).json({ success: false, message: 'Không thể xóa chính mình' });
        return;
    }

    const userResult = await query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM orders WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    await logAdminAction(req, 'delete_user', 'user', String(userId), { username: user.username, role: user.role });

    res.json({ success: true, message: `Đã xóa user ${user.username}` });
});

// ============================================
// POST /admin/adjust-balance — Adjust user balance (+ or -)
// ============================================
router.post('/adjust-balance', async (req: AuthRequest, res: Response) => {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount || amount === 0) {
        res.status(400).json({ success: false, message: 'user_id và amount (khác 0) là bắt buộc' });
        return;
    }

    const userResult = await query('SELECT id, username, balance FROM users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];
    if (!user) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }

    const newBalance = user.balance + amount;
    if (newBalance < 0) {
        res.status(400).json({ success: false, message: `Số dư không đủ để trừ. Hiện tại: ${user.balance.toLocaleString()}đ` });
        return;
    }

    const type = amount > 0 ? 'deposit' : 'deduct';

    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, user_id]);
        const txnResult = await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_after, description)
             VALUES ($1, $2, $3, $4, 'Processing...') RETURNING id`,
            [user_id, type, amount, newBalance]
        );
        const txnId = txnResult.rows[0].id;
        const finalDesc = description || (amount > 0
            ? `Hệ thống nạp tiền thành công với số tiền ${amount.toLocaleString('vi-VN')}đ mã giao dịch ${txnId}`
            : `Hệ thống trừ tiền ${Math.abs(amount).toLocaleString('vi-VN')}đ mã giao dịch ${txnId}`);
        await client.query('UPDATE transactions SET description = $1 WHERE id = $2', [finalDesc, txnId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    await logAdminAction(req, 'adjust_balance', 'user', String(user_id), { username: user.username, amount, old_balance: user.balance, new_balance: newBalance, description });

    const action = amount > 0 ? 'nạp' : 'trừ';
    res.json({
        success: true,
        message: `Đã ${action} ${Math.abs(amount).toLocaleString()}đ cho ${user.username}`,
        data: { user_id, new_balance: newBalance },
    });
});

// ============================================
// GET /admin/pricing — Get all pricing config
// ============================================
router.get('/pricing', async (_req: AuthRequest, res: Response) => {
    const pricing = (await query('SELECT * FROM pricing_config ORDER BY service_id')).rows;
    res.json({ success: true, data: pricing });
});

// ============================================
// PUT /admin/pricing/:serviceId — Update markup
// ============================================
router.put('/pricing/:serviceId', async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { markup } = req.body;

    if (!markup || markup < 1) {
        res.status(400).json({ success: false, message: 'Hệ số phải >= 1' });
        return;
    }

    await query(
        `INSERT INTO pricing_config (service_id, markup)
         VALUES ($1, $2)
         ON CONFLICT(service_id) DO UPDATE SET markup = $2, updated_at = NOW()`,
        [serviceId, markup]
    );

    await logAdminAction(req, 'change_pricing', 'pricing', String(serviceId), { markup });

    res.json({ success: true, message: `Đã cập nhật hệ số ${serviceId} = ×${markup}` });
});

// ============================================
// GET /admin/pricing-detail — Pricing with BaoStar originals
// ============================================
router.get('/pricing-detail', async (_req: AuthRequest, res: Response) => {
    try {
        // 1. Fetch BaoStar prices
        const { data: baostarData } = await baostarApi.get('/api/prices');
        const categories = baostarData.data || [];

        // 2. Get all markups
        const allPricing = (await query('SELECT service_id, markup FROM pricing_config')).rows as DbPricingConfig[];
        const markupMap: Record<string, number> = {};
        allPricing.forEach(p => { markupMap[p.service_id] = p.markup; });

        // 3. Get hidden packages
        const allHidden = (await query('SELECT service_id, package_name, original_price FROM hidden_packages')).rows as DbHiddenPackage[];
        const hiddenSet = new Set(allHidden.map(h => `${h.service_id}::${h.package_name}::${h.original_price}`));

        // 4. Get per-package markups and fixed prices
        const allPkgPricing = (await query('SELECT service_id, package_name, original_price, markup, fixed_price FROM package_pricing')).rows as DbPackagePricing[];
        const pkgMarkupMap: Record<string, number> = {};
        const pkgFixedPriceMap: Record<string, number | null> = {};
        allPkgPricing.forEach(p => {
            pkgMarkupMap[`${p.service_id}::${p.package_name}::${p.original_price}`] = p.markup;
            pkgFixedPriceMap[`${p.service_id}::${p.package_name}::${p.original_price}`] = p.fixed_price;
        });

        // 5. Build response
        const result = categories
            .filter((cat: any) => cat.path in serviceMap)
            .map((cat: any) => {
                const serviceId = serviceMap[cat.path] || cat.path;
                const markup = markupMap[serviceId] || 1.5;
                const packages = (cat.package || []).map((pkg: any) => {
                    const pkgKey = `${serviceId}::${pkg.package_name}::${pkg.price_per}`;
                    const effectiveMarkup = pkgMarkupMap[pkgKey] ?? markup;
                    const fixedPrice = pkgFixedPriceMap[pkgKey] ?? null;
                    return {
                        id: pkg.id,
                        package_name: pkg.package_name,
                        name: pkg.name,
                        original_price: pkg.price_per,
                        sell_price: fixedPrice !== null ? fixedPrice : Math.ceil(pkg.price_per * effectiveMarkup),
                        min: pkg.min,
                        max: pkg.max,
                        notes: pkg.notes,
                        hidden: hiddenSet.has(pkgKey),
                        package_markup: pkgMarkupMap[pkgKey] ?? null,
                        fixed_price: fixedPrice,
                    };
                });

                return {
                    service_id: serviceId,
                    service_name: cat.name,
                    path: cat.path,
                    markup,
                    packages,
                };
            });

        res.json({ success: true, data: result });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Không thể lấy giá từ BaoStar: ' + (err.message || '') });
    }
});

// ============================================
// POST /admin/toggle-package — Hide/show a package
// ============================================
router.post('/toggle-package', async (req: AuthRequest, res: Response) => {
    const { service_id, package_name, original_price, hidden } = req.body;

    if (!service_id || !package_name) {
        res.status(400).json({ success: false, message: 'service_id và package_name là bắt buộc' });
        return;
    }

    const price = original_price || 0;

    if (hidden) {
        await query(
            'INSERT INTO hidden_packages (service_id, package_name, original_price) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [service_id, package_name, price]
        );
    } else {
        await query(
            'DELETE FROM hidden_packages WHERE service_id = $1 AND package_name = $2 AND original_price = $3',
            [service_id, package_name, price]
        );
    }

    res.json({ success: true, message: hidden ? 'Đã ẩn gói' : 'Đã hiện gói' });
});

// ============================================
// GET /admin/orders — All orders with user info
// ============================================
router.get('/orders', async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string || '';
    const from = req.query.from as string || '';
    const to = req.query.to as string || '';
    const user = req.query.user as string || '';

    let where = '1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (status) { where += ` AND o.status = $${paramIdx++}`; params.push(status); }
    if (from) { where += ` AND o.created_at >= $${paramIdx++}`; params.push(from); }
    if (to) { where += ` AND o.created_at <= $${paramIdx++}`; params.push(to + ' 23:59:59'); }
    if (user) { where += ` AND u.username LIKE $${paramIdx++}`; params.push(`%${user}%`); }

    const total = parseInt((await query(
        `SELECT COUNT(*) as count FROM orders o JOIN users u ON o.user_id = u.id WHERE ${where}`,
        params
    )).rows[0].count);

    const orders = (await query(`
        SELECT o.*, u.username
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `, [...params, limit, offset])).rows;

    res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ============================================
// GET /admin/transactions — All transactions
// ============================================
router.get('/transactions', async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const total = parseInt((await query('SELECT COUNT(*) as count FROM transactions')).rows[0].count);
    const txns = (await query(`
        SELECT t.*, u.username
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
    `, [limit, offset])).rows;

    res.json({ success: true, data: txns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ============================================
// PUT /admin/package-pricing — Set per-package markup
// ============================================
router.put('/package-pricing', async (req: AuthRequest, res: Response) => {
    const { service_id, package_name, original_price, markup, fixed_price } = req.body;

    if (!service_id || !package_name) {
        res.status(400).json({ success: false, message: 'service_id và package_name là bắt buộc' });
        return;
    }

    const price = original_price || 0;
    const effectiveMarkup = markup || 1;
    const effectiveFixedPrice = (fixed_price !== undefined && fixed_price !== null && fixed_price !== '') ? parseInt(fixed_price) : null;

    await query(
        `INSERT INTO package_pricing (service_id, package_name, original_price, markup, fixed_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(service_id, package_name, original_price) DO UPDATE SET markup = $4, fixed_price = $5, updated_at = NOW()`,
        [service_id, package_name, price, effectiveMarkup, effectiveFixedPrice]
    );

    await logAdminAction(req, 'change_package_pricing', 'pricing', service_id, { package_name, original_price: price, markup: effectiveMarkup, fixed_price: effectiveFixedPrice });

    const msg = effectiveFixedPrice !== null
        ? `Đã đặt giá bán cố định ${effectiveFixedPrice.toLocaleString()}đ cho gói ${package_name}`
        : `Đã cập nhật markup gói ${package_name} = ×${effectiveMarkup}`;
    res.json({ success: true, message: msg });
});

// ============================================
// DELETE /admin/package-pricing — Remove per-package override
// ============================================
router.delete('/package-pricing', async (req: AuthRequest, res: Response) => {
    const { service_id, package_name, original_price } = req.body;
    if (!service_id || !package_name) {
        res.status(400).json({ success: false, message: 'service_id và package_name là bắt buộc' });
        return;
    }
    const price = original_price || 0;
    await query(
        'DELETE FROM package_pricing WHERE service_id = $1 AND package_name = $2 AND original_price = $3',
        [service_id, package_name, price]
    );
    res.json({ success: true, message: 'Đã xóa override markup gói' });
});

// ============================================
// GET /admin/export/:type — CSV export
// ============================================
router.get('/export/:type', async (req: AuthRequest, res: Response) => {
    const type = req.params.type;
    let rows: any[];
    let headers: string[];

    if (type === 'users') {
        headers = ['ID', 'Username', 'Email', 'Phone', 'Balance', 'Role', 'Active', 'Last Login', 'Created'];
        const result = await query(`
            SELECT id, username, email, phone, balance, role, is_active, last_login_at, created_at
            FROM users ORDER BY created_at DESC
        `);
        rows = result.rows.map(r => [r.id, r.username, r.email || '', r.phone || '', r.balance, r.role, r.is_active ? 'Yes' : 'No', r.last_login_at || '', r.created_at]);
    } else if (type === 'orders') {
        headers = ['ID', 'Username', 'Service', 'Package', 'Quantity', 'Cost', 'Sell Price', 'Profit', 'Status', 'Created'];
        const result = await query(`
            SELECT o.id, u.username, o.service_id, o.package_name, o.quantity, o.cost_price, o.sell_price, o.profit, o.status, o.created_at
            FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC
        `);
        rows = result.rows.map(r => [r.id, r.username, r.service_id, r.package_name, r.quantity, r.cost_price, r.sell_price, r.profit, r.status, r.created_at]);
    } else if (type === 'transactions') {
        headers = ['ID', 'Username', 'Type', 'Amount', 'Balance After', 'Description', 'Created'];
        const result = await query(`
            SELECT t.id, u.username, t.type, t.amount, t.balance_after, t.description, t.created_at
            FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC
        `);
        rows = result.rows.map(r => [r.id, r.username, r.type, r.amount, r.balance_after, r.description || '', r.created_at]);
    } else {
        res.status(400).json({ success: false, message: 'Type phải là users, orders, hoặc transactions' });
        return;
    }

    const escapeCsv = (val: any) => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');

    await logAdminAction(req, 'export_data', 'export', type, { rows_count: rows.length });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
    res.send(csv);
});

// ============================================
// GET /admin/audit-log — View admin audit trail
// ============================================
router.get('/audit-log', async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action as string || '';

    let where = '1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (action) { where += ` AND a.action = $${paramIdx++}`; params.push(action); }

    const total = parseInt((await query(
        `SELECT COUNT(*) as count FROM admin_audit_log a WHERE ${where}`, params
    )).rows[0].count);

    const logs = (await query(`
        SELECT a.*, u.username as admin_username
        FROM admin_audit_log a
        JOIN users u ON a.admin_id = u.id
        WHERE ${where}
        ORDER BY a.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `, [...params, limit, offset])).rows;

    res.json({ success: true, data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ============================================
// GET /admin/users/:id/detail — Full user profile for drawer
// ============================================
router.get('/users/:id/detail', async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id as string);

    const userResult = await query(
        `SELECT id, username, email, phone, display_name, balance, role, is_active, created_at, last_login_at,
                updated_at
         FROM users WHERE id = $1`, [userId]
    );
    if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }
    const user = userResult.rows[0];

    // Stats
    const orderStats = (await query(
        `SELECT COUNT(*) as total_orders,
                COALESCE(SUM(sell_price), 0) as total_spent,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
                COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_orders
         FROM orders WHERE user_id = $1`, [userId]
    )).rows[0];

    // Recent orders (10)
    const recentOrders = (await query(
        `SELECT id, service_id, package_name, display_name, object_id, quantity, sell_price, status, created_at
         FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [userId]
    )).rows;

    // Recent transactions (10)
    const recentTransactions = (await query(
        `SELECT id, type, amount, balance_after, description, created_at
         FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [userId]
    )).rows;

    // Notes
    const notes = (await query(
        `SELECT n.*, u.username as admin_username
         FROM user_notes n JOIN users u ON n.admin_id = u.id
         WHERE n.user_id = $1 ORDER BY n.created_at DESC`, [userId]
    )).rows;

    // Audit log entries related to this user
    const auditLogs = (await query(
        `SELECT a.*, u.username as admin_username
         FROM admin_audit_log a JOIN users u ON a.admin_id = u.id
         WHERE a.target_type = 'user' AND a.target_id = $1
         ORDER BY a.created_at DESC LIMIT 20`, [String(userId)]
    )).rows;

    res.json({
        success: true,
        data: {
            user,
            stats: {
                total_orders: parseInt(orderStats.total_orders),
                total_spent: parseInt(orderStats.total_spent),
                completed_orders: parseInt(orderStats.completed_orders),
                processing_orders: parseInt(orderStats.processing_orders),
                failed_orders: parseInt(orderStats.failed_orders),
            },
            recentOrders,
            recentTransactions,
            notes,
            auditLogs,
        },
    });
});

// ============================================
// POST /admin/users/:id/notes — Add admin note to user
// ============================================
router.post('/users/:id/notes', async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id as string);
    const { content, flag } = req.body;

    if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Nội dung ghi chú không được trống' });
        return;
    }

    const validFlags = ['warning', 'fraud', 'vip', null, ''];
    if (flag && !validFlags.includes(flag)) {
        res.status(400).json({ success: false, message: 'Flag không hợp lệ' });
        return;
    }

    const result = await query(
        `INSERT INTO user_notes (user_id, admin_id, content, flag) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, req.user!.id, content.trim(), flag || null]
    );

    await logAdminAction(req, 'add_note', 'user', String(userId), { flag, content: content.trim().substring(0, 100) });

    res.json({ success: true, data: result.rows[0], message: 'Đã thêm ghi chú' });
});

// ============================================
// DELETE /admin/users/notes/:noteId — Remove admin note
// ============================================
router.delete('/users/notes/:noteId', async (req: AuthRequest, res: Response) => {
    const noteId = parseInt(req.params.noteId as string);
    const note = (await query('SELECT * FROM user_notes WHERE id = $1', [noteId])).rows[0];
    if (!note) {
        res.status(404).json({ success: false, message: 'Ghi chú không tồn tại' });
        return;
    }

    await query('DELETE FROM user_notes WHERE id = $1', [noteId]);
    await logAdminAction(req, 'delete_note', 'user', String(note.user_id), { note_id: noteId });

    res.json({ success: true, message: 'Đã xóa ghi chú' });
});

// ============================================
// POST /admin/users/:id/reset-password — Admin reset user password
// ============================================
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.params.id as string);
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        res.status(400).json({ success: false, message: 'Mật khẩu mới phải ít nhất 6 ký tự' });
        return;
    }

    // Verify user exists
    const userResult = await query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }

    const user = userResult.rows[0];
    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    await logAdminAction(req, 'reset_password', 'user', String(userId), { username: user.username });

    res.json({ success: true, message: `Đã đặt lại mật khẩu cho ${user.username}` });
});

export default router;
