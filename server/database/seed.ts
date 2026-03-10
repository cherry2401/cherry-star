import bcrypt from 'bcrypt';
import { query } from './index.js';
import { initDatabase } from './index.js';
import { config } from '../config.js';

// ============================================
// Seed admin user + default pricing
// ============================================

async function seed() {
    console.log('🌱 Seeding database...');

    // Initialize schema first
    await initDatabase();

    // 1. Create admin user if not exists
    const existing = await query('SELECT id FROM users WHERE username = $1', [config.admin.username]);

    if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(config.admin.password, 10);
        await query(
            `INSERT INTO users (username, password_hash, display_name, role, balance)
             VALUES ($1, $2, 'Admin', 'admin', 0)`,
            [config.admin.username, hash]
        );
        console.log(`✅ Admin user created: ${config.admin.username}`);
    } else {
        console.log(`ℹ️  Admin user already exists`);
    }

    // 2. Default pricing config
    const defaultPricing = [
        { service_id: 'like-gia-re', markup: 1.5 },
        { service_id: 'like-chat-luong', markup: 1.5 },
        { service_id: 'like-comment', markup: 1.5 },
        { service_id: 'comment', markup: 1.5 },
        { service_id: 'follow', markup: 1.5 },
        { service_id: 'like-page', markup: 1.5 },
        { service_id: 'mem-group', markup: 1.5 },
        { service_id: 'mat-live', markup: 1.5 },
        { service_id: 'share', markup: 1.5 },
        { service_id: 'vip', markup: 1.25 },
        { service_id: 'tiktok-like', markup: 1.5 },
        { service_id: 'tiktok-follow', markup: 1.5 },
        { service_id: 'tiktok-view', markup: 1.5 },
        { service_id: 'tiktok-save', markup: 1.5 },
        { service_id: 'tiktok-comment', markup: 1.5 },
        { service_id: 'tiktok-share', markup: 1.5 },
        { service_id: 'tiktok-live', markup: 1.5 },
        { service_id: 'tiktok-vip-mat', markup: 1.5 },
        { service_id: 'instagram-like', markup: 1.5 },
        { service_id: 'instagram-follow', markup: 1.5 },
        { service_id: 'instagram-comment', markup: 1.5 },
        { service_id: 'instagram-view', markup: 1.5 },
        { service_id: 'instagram-view-story', markup: 1.5 },
        { service_id: 'instagram-vip-like', markup: 1.25 },
    ];

    for (const p of defaultPricing) {
        await query(
            `INSERT INTO pricing_config (service_id, markup)
             VALUES ($1, $2)
             ON CONFLICT(service_id) DO NOTHING`,
            [p.service_id, p.markup]
        );
    }
    console.log('✅ Default pricing config seeded');

    console.log('🎉 Seed complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
