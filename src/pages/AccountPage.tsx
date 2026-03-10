import { useState, useEffect, type FormEvent } from 'react';
import { User, Lock, BarChart3, Save, Eye, EyeOff, ShoppingCart, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
    total_orders: number;
    total_spent: number;
    total_deposits: number;
    total_refunds: number;
    failed_orders: number;
    by_service: { service_id: string; package_name: string; count: number; total_price: number }[];
}

type Tab = 'profile' | 'password' | 'stats';

export default function AccountPage() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    // Profile state
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Stats state
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.display_name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'stats') loadStats();
    }, [activeTab]);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const { data } = await api.get('/api/orders/stats');
            if (data.success) setStats(data.data);
        } catch {
            toast.error('Không thể tải thống kê');
        } finally {
            setLoadingStats(false);
        }
    };

    const handleProfileSave = async (e: FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const { data } = await api.put('/auth/profile', {
                display_name: displayName,
                email: email || undefined,
                phone: phone || undefined,
            });
            if (data.success) {
                toast.success(data.message);
                await refreshUser();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Mật khẩu mới phải ít nhất 6 ký tự');
            return;
        }
        setSavingPassword(true);
        try {
            const { data } = await api.put('/auth/password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            if (data.success) {
                toast.success(data.message);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setSavingPassword(false);
        }
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (!user) return null;

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'profile', label: 'Thông tin tài khoản', icon: <User size={16} /> },
        { key: 'password', label: 'Đổi mật khẩu', icon: <Lock size={16} /> },
        { key: 'stats', label: 'Thống kê', icon: <BarChart3 size={16} /> },
    ];

    return (
        <div className="fade-in">
            {/* Tabs */}
            <div className="account-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`account-tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab: Profile */}
            {activeTab === 'profile' && (
                <div className="account-content">
                    <div className="account-section">
                        <h3 className="account-section-title">Cập nhật thông tin</h3>
                        <form className="account-form" onSubmit={handleProfileSave}>
                            <div className="account-form-grid">
                                <div className="form-group">
                                    <label className="form-label">Tên hiển thị</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        placeholder="Nhập tên hiển thị"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Chưa cài đặt"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="Chưa cài đặt"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                                {savingProfile ? <RefreshCw size={16} className="spinner" /> : <Save size={16} />}
                                Lưu thay đổi
                            </button>
                        </form>
                    </div>

                    {/* Info Card */}
                    <div className="account-section account-info-card">
                        <h3 className="account-section-title">Thông tin tài khoản</h3>
                        <div className="info-card-center">
                            <div className="info-avatar" style={{ background: getAvatarColor(user.username) }}>
                                {getInitials(user.display_name || user.username)}
                            </div>
                            <h4 className="info-name">{user.display_name || user.username}</h4>
                            <span className="info-role">{user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</span>
                        </div>
                        <div className="info-details">
                            <div className="info-row">
                                <span className="info-label">Số tiền hiện tại:</span>
                                <span className="info-value info-balance">{user.balance.toLocaleString()}đ</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Username:</span>
                                <span className="info-value">{user.username}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">E-mail:</span>
                                <span className="info-value">{user.email || 'Chưa cài đặt'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Số điện thoại:</span>
                                <span className="info-value">{user.phone || 'Chưa cài đặt'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Password */}
            {activeTab === 'password' && (
                <div className="account-content">
                    <div className="account-section">
                        <h3 className="account-section-title">Đổi mật khẩu</h3>
                        <form className="account-form" onSubmit={handlePasswordChange} style={{ maxWidth: 420 }}>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu hiện tại</label>
                                <div className="input-wrapper">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        className="form-input"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" className="input-toggle" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu mới</label>
                                <div className="input-wrapper">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        className="form-input"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        minLength={6}
                                        required
                                    />
                                    <button type="button" className="input-toggle" onClick={() => setShowNewPw(!showNewPw)}>
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                                {savingPassword ? <RefreshCw size={16} className="spinner" /> : <Lock size={16} />}
                                Đổi mật khẩu
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Tab: Stats */}
            {activeTab === 'stats' && (
                <div className="account-content">
                    {loadingStats ? (
                        <div className="empty-state">
                            <div className="spinner" style={{ width: 32, height: 32 }} />
                            <p>Đang tải thống kê...</p>
                        </div>
                    ) : stats ? (
                        <>
                            <div className="account-stats-grid">
                                <div className="account-stat-card">
                                    <ShoppingCart size={20} className="stat-icon blue" />
                                    <div>
                                        <div className="stat-label">Tổng đơn</div>
                                        <div className="stat-number">{stats.total_orders.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="account-stat-card">
                                    <CreditCard size={20} className="stat-icon green" />
                                    <div>
                                        <div className="stat-label">Tổng nạp</div>
                                        <div className="stat-number">{stats.total_deposits.toLocaleString()}đ</div>
                                    </div>
                                </div>
                                <div className="account-stat-card">
                                    <AlertTriangle size={20} className="stat-icon yellow" />
                                    <div>
                                        <div className="stat-label">Đơn lỗi</div>
                                        <div className="stat-number">{stats.failed_orders.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="account-stat-card">
                                    <RefreshCw size={20} className="stat-icon red" />
                                    <div>
                                        <div className="stat-label">Hoàn tiền</div>
                                        <div className="stat-number">{stats.total_refunds.toLocaleString()}đ</div>
                                    </div>
                                </div>
                            </div>

                            {stats.by_service.length > 0 && (
                                <div className="account-section">
                                    <h3 className="account-section-title">Thống kê dịch vụ</h3>
                                    <div className="admin-table-wrap">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Tên dịch vụ</th>
                                                    <th>Số lượng mua</th>
                                                    <th>Tổng tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.by_service.map((s, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td>{s.package_name}</td>
                                                        <td>{s.count.toLocaleString()}</td>
                                                        <td className="td-balance">{s.total_price.toLocaleString()}đ</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <BarChart3 size={64} className="empty-state-icon" />
                            <h3>Chưa có dữ liệu</h3>
                            <p>Thống kê sẽ hiện sau khi bạn bắt đầu sử dụng dịch vụ</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
