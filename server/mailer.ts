import nodemailer from 'nodemailer';
import { config } from './config.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (!transporter && config.smtp.user && config.smtp.pass) {
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
    }
    return transporter;
}

export async function sendResetEmail(email: string, resetLink: string, username: string): Promise<boolean> {
    const t = getTransporter();
    if (!t) {
        console.warn('⚠️  SMTP not configured. Cannot send reset email.');
        return false;
    }

    try {
        await t.sendMail({
            from: config.smtp.from,
            to: email,
            subject: '🔑 Đặt lại mật khẩu - Cherry Star',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
    <h2 style="text-align: center; margin: 0 0 8px; color: #3b82f6;">⭐ Cherry Star</h2>
    <p style="text-align: center; color: #94a3b8; margin: 0 0 24px; font-size: 14px;">Yêu cầu đặt lại mật khẩu</p>
    
    <p style="font-size: 15px; line-height: 1.6;">Xin chào <strong>${username}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.6;">Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục:</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
        🔑 Đặt lại mật khẩu
      </a>
    </div>
    
    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
      Link này sẽ hết hạn sau <strong>15 phút</strong>.<br>
      Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
    </p>
    
    <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
    <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
      Cherry Star — Dịch vụ tăng tương tác mạng xã hội
    </p>
  </div>
</body>
</html>`,
        });
        console.log(`✅ Reset email sent to ${email}`);
        return true;
    } catch (err) {
        console.error('❌ Failed to send reset email:', err);
        return false;
    }
}
