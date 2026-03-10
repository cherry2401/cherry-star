import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type RegisterMethod = 'username' | 'email' | 'phone';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [method, setMethod] = useState<RegisterMethod>('username');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!username || username.length < 3) {
            toast.error('Username phải ít nhất 3 ký tự');
            return;
        }
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
            await register({
                username,
                password,
                email: method === 'email' ? email : undefined,
                phone: method === 'phone' ? phone : undefined,
            });
            toast.success('🎉 Đăng ký thành công!');
            navigate('/', { replace: true });
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <Link to="/" className="auth-back">
                    <ArrowLeft size={16} /> Trang chủ
                </Link>
                <div className="auth-header">
                    <h1>Đăng ký</h1>
                    <p>Tạo tài khoản mới để bắt đầu</p>
                </div>

                {/* Method tabs */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${method === 'username' ? 'active' : ''}`}
                        onClick={() => setMethod('username')}
                        type="button"
                    >Username</button>
                    <button
                        className={`auth-tab ${method === 'email' ? 'active' : ''}`}
                        onClick={() => setMethod('email')}
                        type="button"
                    >Email</button>
                    <button
                        className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
                        onClick={() => setMethod('phone')}
                        type="button"
                    >SĐT</button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nhập username (ít nhất 3 ký tự)"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {method === 'email' && (
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="example@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    {method === 'phone' && (
                        <div className="form-group">
                            <label className="form-label">Số điện thoại</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="0912345678"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Mật khẩu *</label>
                        <div className="password-input-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Ít nhất 6 ký tự"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
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
                        <label className="form-label">Xác nhận mật khẩu *</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            placeholder="Nhập lại mật khẩu"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                        {loading ? (
                            <div className="spinner" style={{ width: 20, height: 20 }} />
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Đăng ký
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
                </div>
            </div>
        </div>
    );
}
