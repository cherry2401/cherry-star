import { useState, useEffect, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Link không hợp lệ');
            navigate('/forgot-password');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            toast.error('Mật khẩu phải ít nhất 6 ký tự');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/reset-password', { token, password });
            if (data.success) {
                setSuccess(true);
                toast.success('Đặt lại mật khẩu thành công!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Link đã hết hạn hoặc không hợp lệ');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <Link to="/login" className="auth-back">
                    <ArrowLeft size={16} /> Quay lại đăng nhập
                </Link>
                <div className="auth-header">
                    <h1>Đặt lại mật khẩu</h1>
                    <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
                </div>

                {success ? (
                    <div className="forgot-success">
                        <div className="forgot-success-icon" style={{ color: '#22c55e' }}>
                            <CheckCircle size={32} />
                        </div>
                        <h3>Thành công!</h3>
                        <p>Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                        <Link to="/login" className="btn-primary auth-submit" style={{ textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>
                            Đăng nhập ngay
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới</label>
                            <div className="password-input-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Ít nhất 6 ký tự"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Xác nhận mật khẩu</label>
                            <div className="password-input-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                                <div className="password-toggle" style={{ pointerEvents: 'none' }}>
                                    <Lock size={18} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                            {loading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }} />
                            ) : (
                                <>
                                    <Lock size={18} />
                                    Đặt lại mật khẩu
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
