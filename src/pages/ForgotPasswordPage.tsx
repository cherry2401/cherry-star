import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Vui lòng nhập email');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            if (data.success) {
                setSent(true);
                toast.success('Đã gửi email đặt lại mật khẩu!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <Link to="/login" className="auth-back">
                    <ArrowLeft size={16} /> Quay lại đăng nhập
                </Link>
                <div className="auth-header">
                    <h1>Quên mật khẩu</h1>
                    <p>Nhập email đã đăng ký để nhận link đặt lại mật khẩu</p>
                </div>

                {sent ? (
                    <div className="forgot-success">
                        <div className="forgot-success-icon">
                            <Send size={32} />
                        </div>
                        <h3>Đã gửi email!</h3>
                        <p>Kiểm tra hộp thư (và thư mục spam) để tìm link đặt lại mật khẩu. Link sẽ hết hạn sau 15 phút.</p>
                        <Link to="/login" className="btn-primary auth-submit" style={{ textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>
                            Quay lại đăng nhập
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="password-input-wrap">
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Nhập email đã đăng ký"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoFocus
                                />
                                <div className="password-toggle" style={{ pointerEvents: 'none' }}>
                                    <Mail size={18} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                            {loading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }} />
                            ) : (
                                <>
                                    <Send size={18} />
                                    Gửi link đặt lại
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link></p>
                </div>
            </div>
        </div>
    );
}
