import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../database/index.js';
import { authRequired, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// POST /auth/register
// ============================================
router.post('/register', async (req: Request, res: Response) => {
    const { username, password, email, phone, display_name } = req.body;

    // Validate required fields
    if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username và mật khẩu là bắt buộc' });
        return;
    }
    if (username.length < 3) {
        res.status(400).json({ success: false, message: 'Username phải ít nhất 3 ký tự' });
        return;
    }
    if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
        return;
    }

    // Validate email format
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Email không đúng định dạng' });
            return;
        }
    }

    // Validate phone format (Vietnamese: 10 digits starting with 0)
    if (phone) {
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)' });
            return;
        }
    }

    // Check if username/email/phone already exists
    const existing = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR (email = $2 AND email IS NOT NULL) OR (phone = $3 AND phone IS NOT NULL)',
        [username, email || null, phone || null]
    );

    if (existing.rows.length > 0) {
        res.status(400).json({ success: false, message: 'Username, email hoặc SĐT đã được sử dụng' });
        return;
    }

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
        `INSERT INTO users (username, password_hash, email, phone, display_name)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, hash, email || null, phone || null, display_name || username]
    );

    const userId = result.rows[0].id;

    // Generate JWT
    const token = jwt.sign(
        { id: userId, username, role: 'user' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    res.json({
        success: true,
        message: 'Đăng ký thành công!',
        data: {
            token,
            user: {
                id: userId,
                username,
                email: email || null,
                phone: phone || null,
                display_name: display_name || username,
                balance: 0,
                role: 'user',
            },
        },
    });
});

// ============================================
// POST /auth/login
// ============================================
router.post('/login', async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
        return;
    }

    // Auto-detect: username, email, or phone
    const result = await query(
        `SELECT id, username, email, phone, password_hash, display_name, balance, role, is_active
         FROM users
         WHERE LOWER(username) = LOWER($1) OR email = $1 OR phone = $1`,
        [identifier]
    );
    const user = result.rows[0];

    // Unified error message to prevent username enumeration
    const invalidCredentials = 'Tài khoản hoặc mật khẩu không đúng';

    if (!user) {
        res.status(401).json({ success: false, message: invalidCredentials });
        return;
    }
    if (!user.is_active) {
        res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        return;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
        res.status(401).json({ success: false, message: invalidCredentials });
        return;
    }

    // Generate JWT
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    // Update last login timestamp
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                display_name: user.display_name,
                balance: user.balance,
                role: user.role,
            },
        },
    });
});

// ============================================
// GET /auth/me
// ============================================
router.get('/me', authRequired, async (req: AuthRequest, res: Response) => {
    const result = await query(
        `SELECT id, username, email, phone, display_name, balance, role, created_at
         FROM users WHERE id = $1`,
        [req.user!.id]
    );
    const user = result.rows[0];

    if (!user) {
        res.status(404).json({ success: false, message: 'User không tồn tại' });
        return;
    }

    res.json({ success: true, data: user });
});

// ============================================
// PUT /auth/profile — Update profile info
// ============================================
router.put('/profile', authRequired, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { display_name, email, phone } = req.body;

    // Validate email format
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Email không đúng định dạng' });
            return;
        }
        const dup = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (dup.rows.length > 0) { res.status(400).json({ success: false, message: 'Email đã được sử dụng' }); return; }
    }

    // Validate phone format (Vietnamese: 10 digits starting with 0)
    if (phone) {
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)' });
            return;
        }
        const dup = await query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, userId]);
        if (dup.rows.length > 0) { res.status(400).json({ success: false, message: 'Số điện thoại đã được sử dụng' }); return; }
    }

    await query(
        `UPDATE users SET display_name = $1, email = $2, phone = $3, updated_at = NOW()
         WHERE id = $4`,
        [display_name || null, email || null, phone || null, userId]
    );

    const updated = await query(
        'SELECT id, username, email, phone, display_name, balance, role, created_at FROM users WHERE id = $1',
        [userId]
    );
    res.json({ success: true, message: 'Cập nhật thành công!', data: updated.rows[0] });
});

// ============================================
// PUT /auth/password — Change password
// ============================================
router.put('/password', authRequired, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        return;
    }
    if (new_password.length < 6) {
        res.status(400).json({ success: false, message: 'Mật khẩu mới phải ít nhất 6 ký tự' });
        return;
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
        res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
        return;
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
});

// ============================================
// POST /auth/forgot-password
// ============================================
router.post('/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
        return;
    }

    // Always return success to prevent email enumeration
    const successMsg = 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.';

    const result = await query(
        'SELECT id, username, email FROM users WHERE email = $1 AND is_active = true',
        [email]
    );
    const user = result.rows[0];

    if (!user) {
        // Don't reveal if email exists
        res.json({ success: true, message: successMsg });
        return;
    }

    // Generate secure token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Invalidate old tokens for this user
    await query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);

    // Store new token
    await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
    );

    // Send email
    const { sendResetEmail } = await import('../mailer.js');
    const resetLink = `${config.appUrl}/reset-password?token=${token}`;
    const sent = await sendResetEmail(user.email, resetLink, user.username);

    if (!sent) {
        console.warn('Email not sent - SMTP not configured or failed');
    }

    res.json({ success: true, message: successMsg });
});

// ============================================
// POST /auth/reset-password
// ============================================
router.post('/reset-password', async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
        res.status(400).json({ success: false, message: 'Token và mật khẩu mới là bắt buộc' });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
        return;
    }

    // Find valid token
    const result = await query(
        `SELECT t.id, t.user_id, u.username FROM password_reset_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token = $1 AND t.used = false AND t.expires_at > NOW() AND u.is_active = true`,
        [token]
    );

    if (result.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Link đặt lại đã hết hạn hoặc không hợp lệ' });
        return;
    }

    const { id: tokenId, user_id: userId } = result.rows[0];

    // Update password
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    // Mark token as used
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' });
});

// ============================================
// POST /auth/google — Google OAuth Sign-In
// ============================================
router.post('/google', async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
        res.status(400).json({ success: false, message: 'Token không hợp lệ' });
        return;
    }

    if (!config.google.clientId) {
        res.status(500).json({ success: false, message: 'Google Sign-In chưa được cấu hình' });
        return;
    }

    try {
        // Verify Google ID token
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(config.google.clientId);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: config.google.clientId,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email) {
            res.status(400).json({ success: false, message: 'Token Google không hợp lệ' });
            return;
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || email.split('@')[0];

        // Check if user with this google_id exists
        let userResult = await query(
            'SELECT id, username, email, display_name, balance, role, is_active FROM users WHERE google_id = $1',
            [googleId]
        );

        let user = userResult.rows[0];

        if (!user) {
            // Check if user with same email exists (link accounts)
            userResult = await query(
                'SELECT id, username, email, display_name, balance, role, is_active, google_id FROM users WHERE email = $1',
                [email]
            );
            user = userResult.rows[0];

            if (user) {
                // Link Google ID to existing account
                await query('UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2', [googleId, user.id]);
            } else {
                // Create new user
                const username = email.split('@')[0] + '_' + googleId.slice(-4);
                const result = await query(
                    `INSERT INTO users (username, email, google_id, display_name)
                     VALUES ($1, $2, $3, $4) RETURNING id, username, email, display_name, balance, role, is_active`,
                    [username, email, googleId, name]
                );
                user = result.rows[0];
            }
        }

        if (!user.is_active) {
            res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
            return;
        }

        // Update last login
        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.display_name,
                    balance: user.balance,
                    role: user.role,
                },
            },
        });
    } catch (err: any) {
        console.error('Google auth error:', err);
        res.status(401).json({ success: false, message: 'Xác thực Google thất bại' });
    }
});

export default router;
