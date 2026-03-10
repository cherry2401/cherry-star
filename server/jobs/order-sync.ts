import { query, getClient } from '../database/index.js';
import { baostarApi } from '../routes/services.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50;

/**
 * Sync order statuses from BaoStar API.
 * Fetches all 'processing' orders, queries BaoStar for their status,
 * and updates the local database accordingly.
 */
async function syncOrderStatuses() {
    try {
        const pendingResult = await query(
            "SELECT id, baostar_order_id FROM orders WHERE status = 'processing' AND baostar_order_id IS NOT NULL ORDER BY created_at ASC LIMIT $1",
            [BATCH_SIZE]
        );
        const pendingOrders = pendingResult.rows as { id: number; baostar_order_id: number }[];

        if (pendingOrders.length === 0) return;

        const orderIds = pendingOrders.map(o => o.baostar_order_id).join(',');

        const { data } = await baostarApi.post('/api/logs-order', {
            type: 'like',
            list_ids: orderIds,
        });

        if (!data.success || !Array.isArray(data.data)) return;

        const validStatuses = ['done', 'processing', 'canceled', 'error'];

        const client = await getClient();
        try {
            await client.query('BEGIN');
            for (const log of data.data) {
                const newStatus = validStatuses.includes(log.status) ? log.status : 'processing';
                if (newStatus !== 'processing') {
                    await client.query(
                        'UPDATE orders SET status = $1 WHERE baostar_order_id = $2',
                        [newStatus, log.id]
                    );
                }
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        const updated = data.data.filter((l: any) => l.status !== 'processing').length;
        if (updated > 0) {
            console.log(`[OrderSync] Updated ${updated}/${pendingOrders.length} orders`);
        }
    } catch (err) {
        console.error('[OrderSync] Error syncing orders:', (err as Error).message);
    }
}

/**
 * Start the periodic order sync job.
 */
export function startOrderSync() {
    // Run once on startup after a short delay
    setTimeout(syncOrderStatuses, 10_000);

    // Then run periodically
    setInterval(syncOrderStatuses, SYNC_INTERVAL_MS);

    console.log(`[OrderSync] Started (every ${SYNC_INTERVAL_MS / 1000}s)`);
}
