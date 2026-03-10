import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/services.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import { authRequired, AuthRequest } from './middleware/auth.js';
import { query } from './database/index.js';
import { initDatabase } from './database/index.js';
import { startOrderSync } from './jobs/order-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// Security Middleware
// ============================================
app.use(helmet());
app.use(cors({
    origin: config.nodeEnv === 'production'
        ? (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting: only in production
if (config.nodeEnv === 'production') {
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
        standardHeaders: true,
        legacyHeaders: false,
    }));
}

const authLimiter = config.nodeEnv === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 15,
        message: { success: false, message: 'Quá nhiều lần thử, vui lòng đợi 15 phút' },
    })
    : (_req: any, _res: any, next: any) => next(); // no-op in dev

// ============================================
// Routes
// ============================================

// Auth (public, rate-limited in production)
app.use('/auth', authLimiter, authRoutes);

// BaoStar proxy: prices & convert-uid (public)
app.use('/api', serviceRoutes);

// Orders (auth required)
app.use('/api/orders', orderRoutes);

// User balance & transactions
app.get('/api/user/balance', authRequired, async (req: AuthRequest, res) => {
    const result = await query('SELECT balance FROM users WHERE id = $1', [req.user!.id]);
    res.json({ success: true, data: { balance: result.rows[0]?.balance || 0 } });
});

app.get('/api/user/transactions', authRequired, async (req: AuthRequest, res) => {
    const txns = await query(`
        SELECT id, type, amount, balance_after, description, created_at
        FROM transactions WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 50
    `, [req.user!.id]);
    res.json({ success: true, data: txns.rows });
});

// Admin
app.use('/admin', adminRoutes);

// ============================================
// Health check
// ============================================
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================
// Static frontend (production only)
// ============================================
if (config.nodeEnv === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // SPA fallback: any unmatched route → index.html
    app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// ============================================
// Error handler
// ============================================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
});

// ============================================
// Start (initialize DB first, then listen)
// ============================================
async function start() {
    try {
        await initDatabase();

        app.listen(config.port, () => {
            console.log(`🚀 Server running at http://localhost:${config.port}`);
            console.log(`🗄️  Database: Supabase Postgres`);
            console.log(`🔗 BaoStar API: ${config.baostar.domain}`);

            // Start background jobs
            startOrderSync();
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

start();
