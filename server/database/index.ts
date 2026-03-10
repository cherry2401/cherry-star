import pg from 'pg';
import { config } from '../config.js';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.database.url,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Helper: run a query and return result
export async function query(text: string, params?: any[]) {
    return pool.query(text, params);
}

// Helper: get a client for transactions
export async function getClient() {
    return pool.connect();
}

// ============================================
// Initialize schema
// ============================================
export async function initDatabase() {
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT UNIQUE,
            phone         TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            display_name  TEXT,
            balance       INTEGER DEFAULT 0,
            role          TEXT DEFAULT 'user',
            is_active     BOOLEAN DEFAULT TRUE,
            last_login_at TIMESTAMPTZ,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id            SERIAL PRIMARY KEY,
            user_id       INTEGER NOT NULL REFERENCES users(id),
            type          TEXT NOT NULL,
            amount        INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            description   TEXT,
            metadata      TEXT,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
            id               SERIAL PRIMARY KEY,
            user_id          INTEGER NOT NULL REFERENCES users(id),
            baostar_order_id INTEGER,
            service_id       TEXT NOT NULL,
            package_name     TEXT NOT NULL,
            display_name     TEXT,
            object_id        TEXT NOT NULL,
            quantity         INTEGER,
            sell_price       INTEGER NOT NULL,
            cost_price       INTEGER NOT NULL,
            profit           INTEGER NOT NULL,
            status           TEXT DEFAULT 'processing',
            request_data     TEXT,
            created_at       TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS pricing_config (
            id          SERIAL PRIMARY KEY,
            service_id  TEXT UNIQUE NOT NULL,
            markup      REAL NOT NULL DEFAULT 1.5,
            updated_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS hidden_packages (
            id             SERIAL PRIMARY KEY,
            service_id     TEXT NOT NULL,
            package_name   TEXT NOT NULL,
            original_price INTEGER NOT NULL DEFAULT 0,
            created_at     TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(service_id, package_name, original_price)
        );

        CREATE TABLE IF NOT EXISTS package_pricing (
            id             SERIAL PRIMARY KEY,
            service_id     TEXT NOT NULL,
            package_name   TEXT NOT NULL,
            original_price INTEGER NOT NULL DEFAULT 0,
            markup         REAL NOT NULL,
            fixed_price    INTEGER,
            updated_at     TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(service_id, package_name, original_price)
        );

        CREATE TABLE IF NOT EXISTS admin_audit_log (
            id          SERIAL PRIMARY KEY,
            admin_id    INTEGER NOT NULL REFERENCES users(id),
            action      TEXT NOT NULL,
            target_type TEXT,
            target_id   TEXT,
            details     JSONB DEFAULT '{}',
            ip_address  TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_notes (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            admin_id    INTEGER NOT NULL REFERENCES users(id),
            content     TEXT NOT NULL,
            flag        TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id);
    `);

    // Seed admin user if not exists
    const adminCheck = await query('SELECT id FROM users WHERE username = $1', [config.admin.username]);
    if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash(config.admin.password, 10);
        await query(
            `INSERT INTO users (username, password_hash, display_name, role, balance)
             VALUES ($1, $2, $3, 'admin', 0)`,
            [config.admin.username, hash, config.admin.username]
        );
        console.log(`✅ Admin user "${config.admin.username}" created`);
    }

    console.log('✅ Database initialized');
}

export default pool;
