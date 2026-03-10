import dotenv from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure dotenv loads from the server root and overrides PM2 cached variables
dotenv.config({ path: join(process.cwd(), '.env'), override: true });

// Validate critical env vars
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'JWT_SECRET is required in production and must be at least 32 characters.\n' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
        );
    }
    console.warn('⚠️  JWT_SECRET not set or too short. Using random secret (tokens will invalidate on restart).');
}

export const config = {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',

    jwt: {
        secret: process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
            ? process.env.JWT_SECRET
            : crypto.randomBytes(64).toString('hex'),
        expiresIn: 86400 as number, // 24 hours in seconds
    },

    baostar: {
        domain: process.env.BAOSTAR_API_DOMAIN || 'https://dichvu.baostar.net',
        apiKey: process.env.BAOSTAR_API_KEY || '',
    },

    database: {
        url: process.env.DATABASE_URL || '',
    },

    admin: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: (() => {
            if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;

            const tempPass = crypto.randomBytes(16).toString('hex');
            console.warn(`⚠️  ADMIN_PASSWORD not set in .env. Using temporary password: ${tempPass}`);
            return tempPass;
        })(),
    },

    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    },

    appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || '3001'}`,
};
