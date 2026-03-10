import { useState, useEffect } from 'react';
import {
    X, User, StickyNote, ShoppingCart, Wallet, FileText,
    Plus, Trash2, AlertTriangle, ShieldAlert, Star,
    Lock, Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

type DrawerTab = 'profile' | 'notes' | 'orders' | 'transactions' | 'audit';

interface UserNote {
    id: number;
    admin_username: string;
    content: string;
    flag: string | null;
    created_at: string;
}

interface UserDetailData {
    user: {
        id: number;
        username: string;
        email: string | null;
        phone: string | null;
        display_name: string | null;
        balance: number;
        role: string;
        is_active: boolean;
        created_at: string;
        last_login_at: string | null;
        updated_at: string;
    };
    stats: {
        total_orders: number;
        total_spent: number;
        completed_orders: number;
        processing_orders: number;
        failed_orders: number;
    };
    recentOrders: any[];
    recentTransactions: any[];
    notes: UserNote[];
    auditLogs: any[];
}

const FLAG_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    warning: { icon: AlertTriangle, label: '⚠️ Cảnh báo', color: '#f59e0b' },
    fraud: { icon: ShieldAlert, label: '🚫 Gian lận', color: '#ef4444' },
    vip: { icon: Star, label: '⭐ VIP', color: '#8b5cf6' },
};

const DRAWER_TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Hồ sơ', icon: User },
    { key: 'notes', label: 'Ghi chú', icon: StickyNote },
    { key: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
    { key: 'transactions', label: 'Giao dịch', icon: Wallet },
    { key: 'audit', label: 'Nhật ký', icon: FileText },
];

interface Props {
    userId: number;
    onClose: () => void;
    onAction: () => void; // refresh parent after actions
}

export default function UserDetailDrawer({ userId, onClose, onAction }: Props) {
    const [data, setData] = useState<UserDetailData | null>(null);
    const [tab, setTab] = useState<DrawerTab>('profile');
    const [noteContent, setNoteContent] = useState('');
    const [noteFlag, setNoteFlag] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDetail();
    }, [userId]);

    const loadDetail = async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get(`/admin/users/${userId}/detail`);
            if (res.success) setData(res.data);
        } catch {
            toast.error('Không thể tải thông tin user');
        } finally {
            setLoading(false);
        }
    };

    const addNote = async () => {
        if (!noteContent.trim()) return;
        try {
            const { data: res } = await api.post(`/admin/users/${userId}/notes`, {
                content: noteContent,
                flag: noteFlag || null,
            });
            if (res.success) {
                toast.success('Đã thêm ghi chú');
                setNoteContent('');
                setNoteFlag('');
                loadDetail();
            }
        } catch { toast.error('Lỗi thêm ghi chú'); }
    };

    const deleteNote = async (noteId: number) => {
        try {
            await api.delete(`/admin/users/notes/${noteId}`);
            toast.success('Đã xóa ghi chú');
            loadDetail();
        } catch { toast.error('Lỗi xóa ghi chú'); }
    };

    const toggleActive = async () => {
        if (!data) return;
        try {
            await api.put(`/admin/users/${userId}`, { is_active: !data.user.is_active });
            toast.success(data.user.is_active ? 'Đã khóa tài khoản' : 'Đã mở khóa');
            loadDetail();
            onAction();
        } catch { toast.error('Lỗi cập nhật'); }
    };

    const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN');

    if (loading || !data) {
        return (
            <div className="drawer-overlay" onClick={onClose}>
                <div className="drawer-panel" onClick={e => e.stopPropagation()}>
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Đang tải...
                    </div>
                </div>
            </div>
        );
    }

    const { user, stats, recentOrders, recentTransactions, notes, auditLogs } = data;

    // Determine active flags from notes
    const activeFlags = [...new Set(notes.filter(n => n.flag).map(n => n.flag!))];

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="drawer-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="drawer-header">
                    <div className="drawer-header-info">
                        <div className="drawer-avatar">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="drawer-username">
                                {user.username}
                                {activeFlags.map(f => {
                                    const cfg = FLAG_CONFIG[f];
                                    return cfg ? (
                                        <span key={f} className="flag-badge" style={{ background: `${cfg.color}20`, color: cfg.color }} title={cfg.label}>
                                            <cfg.icon size={12} /> {f}
                                        </span>
                                    ) : null;
                                })}
                            </h3>
                            <div className="drawer-subtitle">
                                ID: {user.id} · {user.role} ·
                                <span className={user.is_active ? 'text-green' : 'text-red'}>
                                    {user.is_active ? ' Active' : ' Locked'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="drawer-header-actions">
                        <button className={`btn-sm ${user.is_active ? 'btn-red' : 'btn-blue'}`} onClick={toggleActive} title={user.is_active ? 'Khóa' : 'Mở khóa'}>
                            {user.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                        <button className="btn-sm" onClick={onClose}><X size={16} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="drawer-tabs">
                    {DRAWER_TABS.map(t => (
                        <button
                            key={t.key}
                            className={`drawer-tab ${tab === t.key ? 'active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            <t.icon size={14} />
                            {t.label}
                            {t.key === 'notes' && notes.length > 0 && (
                                <span className="tab-count">{notes.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="drawer-content">
                    {tab === 'profile' && (
                        <div className="drawer-profile">
                            <div className="profile-grid">
                                <div className="profile-item">
                                    <span className="profile-label">Email</span>
                                    <span className="profile-value">{user.email || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="profile-label">Điện thoại</span>
                                    <span className="profile-value">{user.phone || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="profile-label">Tên hiển thị</span>
                                    <span className="profile-value">{user.display_name || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="profile-label">Số dư</span>
                                    <span className="profile-value td-balance">{user.balance.toLocaleString()}đ</span>
                                </div>
                                <div className="profile-item">
                                    <span className="profile-label">Đăng ký</span>
                                    <span className="profile-value">{formatDate(user.created_at)}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="profile-label">Login cuối</span>
                                    <span className="profile-value">{user.last_login_at ? formatDate(user.last_login_at) : '—'}</span>
                                </div>
                            </div>
                            <div className="profile-stats">
                                <div className="mini-stat">
                                    <span className="mini-stat-value">{stats.total_orders}</span>
                                    <span className="mini-stat-label">Tổng đơn</span>
                                </div>
                                <div className="mini-stat">
                                    <span className="mini-stat-value text-green">{stats.completed_orders}</span>
                                    <span className="mini-stat-label">Hoàn thành</span>
                                </div>
                                <div className="mini-stat">
                                    <span className="mini-stat-value text-orange">{stats.processing_orders}</span>
                                    <span className="mini-stat-label">Đang xử lý</span>
                                </div>
                                <div className="mini-stat">
                                    <span className="mini-stat-value text-red">{stats.failed_orders}</span>
                                    <span className="mini-stat-label">Thất bại</span>
                                </div>
                                <div className="mini-stat">
                                    <span className="mini-stat-value">{stats.total_spent.toLocaleString()}đ</span>
                                    <span className="mini-stat-label">Chi tiêu</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'notes' && (
                        <div className="drawer-notes">
                            {/* Add note form */}
                            <div className="note-form">
                                <textarea
                                    className="form-input"
                                    placeholder="Viết ghi chú cho user này..."
                                    value={noteContent}
                                    onChange={e => setNoteContent(e.target.value)}
                                    rows={3}
                                />
                                <div className="note-form-actions">
                                    <select className="form-input" style={{ width: 'auto', fontSize: 13 }} value={noteFlag} onChange={e => setNoteFlag(e.target.value)}>
                                        <option value="">Không flag</option>
                                        <option value="warning">⚠️ Cảnh báo</option>
                                        <option value="fraud">🚫 Gian lận</option>
                                        <option value="vip">⭐ VIP</option>
                                    </select>
                                    <button className="btn-sm btn-blue" onClick={addNote} disabled={!noteContent.trim()}>
                                        <Plus size={14} /> Thêm
                                    </button>
                                </div>
                            </div>

                            {/* Notes list */}
                            {notes.map(note => (
                                <div key={note.id} className={`note-card ${note.flag ? `note-${note.flag}` : ''}`}>
                                    <div className="note-header">
                                        <span className="note-author">{note.admin_username}</span>
                                        {note.flag && FLAG_CONFIG[note.flag] && (
                                            <span className="flag-badge" style={{ background: `${FLAG_CONFIG[note.flag].color}20`, color: FLAG_CONFIG[note.flag].color }}>
                                                {FLAG_CONFIG[note.flag].label}
                                            </span>
                                        )}
                                        <span className="note-date">{formatDate(note.created_at)}</span>
                                        <button className="btn-icon-sm" onClick={() => deleteNote(note.id)} title="Xóa">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="note-content">{note.content}</div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="td-empty" style={{ padding: 24 }}>Chưa có ghi chú</div>
                            )}
                        </div>
                    )}

                    {tab === 'orders' && (
                        <div className="drawer-table-wrap">
                            <table className="admin-table compact">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Dịch vụ</th>
                                        <th>Giá</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((o: any) => (
                                        <tr key={o.id}>
                                            <td>#{o.id}</td>
                                            <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.display_name || o.package_name}</td>
                                            <td className="td-balance">{o.sell_price.toLocaleString()}đ</td>
                                            <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                                            <td className="td-date" style={{ fontSize: 11 }}>{formatDate(o.created_at)}</td>
                                        </tr>
                                    ))}
                                    {recentOrders.length === 0 && <tr><td colSpan={5} className="td-empty">Chưa có đơn</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'transactions' && (
                        <div className="drawer-table-wrap">
                            <table className="admin-table compact">
                                <thead>
                                    <tr>
                                        <th>Loại</th>
                                        <th>Số tiền</th>
                                        <th>Sau GD</th>
                                        <th>Mô tả</th>
                                        <th>Ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((t: any) => (
                                        <tr key={t.id}>
                                            <td><span className={`status-badge status-${t.type === 'deposit' ? 'completed' : 'processing'}`}>{t.type}</span></td>
                                            <td className={t.amount > 0 ? 'text-green' : 'text-red'}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}đ</td>
                                            <td>{t.balance_after.toLocaleString()}đ</td>
                                            <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={t.description}>{t.description || '—'}</td>
                                            <td className="td-date" style={{ fontSize: 11 }}>{formatDate(t.created_at)}</td>
                                        </tr>
                                    ))}
                                    {recentTransactions.length === 0 && <tr><td colSpan={5} className="td-empty">Chưa có giao dịch</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'audit' && (
                        <div className="drawer-table-wrap">
                            <table className="admin-table compact">
                                <thead>
                                    <tr>
                                        <th>Hành động</th>
                                        <th>Admin</th>
                                        <th>Chi tiết</th>
                                        <th>Ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log: any) => (
                                        <tr key={log.id}>
                                            <td><span className={`status-badge status-${log.action.includes('delete') || log.action.includes('disable') ? 'failed' : 'completed'}`}>{log.action}</span></td>
                                            <td>{log.admin_username}</td>
                                            <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={JSON.stringify(log.details)}>
                                                {JSON.stringify(log.details).substring(0, 60)}
                                            </td>
                                            <td className="td-date" style={{ fontSize: 11 }}>{formatDate(log.created_at)}</td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && <tr><td colSpan={4} className="td-empty">Chưa có nhật ký</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
