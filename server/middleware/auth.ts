import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../database/index.js';

export interface AuthUser {
    id: number;
    username: string;
    role: string;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

/**
 * JWT authentication middleware
 * Verifies Bearer token and attaches user to request
 */
export async function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;

        // Verify user still exists and is active
        const result = await query('SELECT id, username, role, is_active FROM users WHERE id = $1', [decoded.id]);
        const user = result.rows[0];
        if (!user || !user.is_active) {
            res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ' });
            return;
        }

        req.user = { id: user.id, username: user.username, role: user.role };
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Token hết hạn, vui lòng đăng nhập lại' });
    }
}

/**
 * Admin-only middleware (must be used AFTER authRequired)
 */
export function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
        return;
    }
    next();
}
