import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Download, Trash2, Eye, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { AdminUser } from '../../types/admin';
import UserDetailDrawer from './UserDetailDrawer';

export default function AdminUsers() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [depositModal, setDepositModal] = useState<{ userId: number; username: string; mode: 'add' | 'deduct' } | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ userId: number; username: string } | null>(null);
    const [resetPwModal, setResetPwModal] = useState<{ userId: number; username: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            const { data } = await api.get('/admin/users', { params: { search: userSearch } });
            if (data.success) setUsers(data.data);
        } catch { toast.error('Không thể tải danh sách user'); }
    };

    const handleDeposit = async () => {
        if (!depositModal || !depositAmount) return;
        const rawAmount = parseInt(depositAmount);
        if (isNaN(rawAmount) || rawAmount <= 0) { toast.error('Số tiền không hợp lệ'); return; }
        const amount = depositModal.mode === 'deduct' ? -rawAmount : rawAmount;
        try {
            const { data } = await api.post('/admin/adjust-balance', {
                user_id: depositModal.userId,
                amount,
            });
            if (data.success) {
                toast.success(data.message);
                setDepositModal(null);
                setDepositAmount('');
                loadUsers();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Lỗi điều chỉnh số dư');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteConfirm) return;
        try {
            const { data } = await api.delete(`/admin/users/${deleteConfirm.userId}`);
            if (data.success) {
                toast.success(data.message);
                setDeleteConfirm(null);
                loadUsers();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Lỗi xóa user');
        }
    };

    const toggleUserActive = async (userId: number, currentActive: boolean) => {
        try {
            await api.put(`/admin/users/${userId}`, { is_active: !currentActive });
            toast.success(currentActive ? 'Đã khóa tài khoản' : 'Đã mở khóa');
            loadUsers();
        } catch { toast.error('Lỗi cập nhật'); }
    };

    const handleResetPassword = async () => {
        if (!resetPwModal || !newPassword || newPassword.length < 6) {
            toast.error('Mật khẩu phải ít nhất 6 ký tự');
            return;
        }
        try {
            const { data } = await api.post(`/admin/users/${resetPwModal.userId}/reset-password`, { new_password: newPassword });
            if (data.success) {
                toast.success(data.message);
                setResetPwModal(null);
                setNewPassword('');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Lỗi đặt lại mật khẩu');
        }
    };

    const exportCsv = async () => {
        try {
            const { data } = await api.get('/admin/export/users', { responseType: 'blob' });
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'users-export.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Lỗi xuất CSV'); }
    };

    return (
        <div className="admin-section">
            <div className="admin-toolbar">
                <div className="admin-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Tìm user..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadUsers()}
                    />
                </div>
                <button className="btn-sm" onClick={exportCsv} title="Xuất CSV">
                    <Download size={14} /> CSV
                </button>
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email / SĐT</th>
                            <th>Số dư</th>
                            <th>Đơn / Chi tiêu</th>
                            <th>Login cuối</th>
                            <th>Role</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>{u.id}</td>
                                <td className="td-bold">
                                    <button
                                        className="link-btn"
                                        onClick={() => setSelectedUserId(u.id)}
                                        title="Xem chi tiết user"
                                    >
                                        {u.username}
                                    </button>
                                </td>
                                <td>{u.email || u.phone || '—'}</td>
                                <td className="td-balance">{u.balance.toLocaleString()}đ</td>
                                <td>
                                    <div style={{ fontSize: 13 }}>{u.total_orders} đơn</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.total_spent.toLocaleString()}đ</div>
                                </td>
                                <td className="td-date" style={{ fontSize: 12 }}>
                                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('vi-VN') : '—'}
                                </td>
                                <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                                <td>
                                    <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}>
                                        {u.is_active ? 'Active' : 'Locked'}
                                    </span>
                                </td>
                                <td>
                                    <div className="td-actions">
                                        <button
                                            className="btn-sm btn-blue"
                                            onClick={() => setSelectedUserId(u.id)}
                                            title="Xem chi tiết"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            className="btn-sm btn-green"
                                            onClick={() => setDepositModal({ userId: u.id, username: u.username, mode: 'add' })}
                                            title="Nạp tiền"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            className="btn-sm btn-orange"
                                            onClick={() => setDepositModal({ userId: u.id, username: u.username, mode: 'deduct' })}
                                            title="Trừ tiền"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <button
                                            className={`btn-sm ${u.is_active ? 'btn-red' : 'btn-blue'}`}
                                            onClick={() => toggleUserActive(u.id, !!u.is_active)}
                                        >
                                            {u.is_active ? 'Khóa' : 'Mở'}
                                        </button>
                                        <button
                                            className="btn-sm btn-red"
                                            onClick={() => setDeleteConfirm({ userId: u.id, username: u.username })}
                                            title="Xóa user"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            className="btn-sm"
                                            onClick={() => setResetPwModal({ userId: u.id, username: u.username })}
                                            title="Đặt lại mật khẩu"
                                        >
                                            <KeyRound size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* User Detail Drawer */}
            {selectedUserId && (
                <UserDetailDrawer
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                    onAction={() => loadUsers()}
                />
            )}

            {/* Balance adjustment modal */}
            {depositModal && (
                <div className="modal-overlay" onClick={() => setDepositModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>
                            {depositModal.mode === 'add' ? 'Nạp tiền cho' : 'Trừ tiền của'}{' '}
                            <strong>{depositModal.username}</strong>
                        </h3>
                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="form-label">Số tiền (VNĐ)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="50000"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDepositModal(null)}>Hủy</button>
                            <button
                                className={depositModal.mode === 'add' ? 'btn-primary' : 'btn-danger'}
                                onClick={handleDeposit}
                            >
                                {depositModal.mode === 'add' ? (
                                    <><Plus size={16} /> Nạp tiền</>
                                ) : (
                                    <><Minus size={16} /> Trừ tiền</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Xác nhận xóa user</h3>
                        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
                            Bạn có chắc muốn xóa user <strong>{deleteConfirm.username}</strong>?
                            Tất cả đơn hàng và giao dịch liên quan sẽ bị xóa.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Hủy</button>
                            <button className="btn-danger" onClick={handleDeleteUser}>
                                <Trash2 size={16} /> Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset password modal */}
            {resetPwModal && (
                <div className="modal-overlay" onClick={() => { setResetPwModal(null); setNewPassword(''); }}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>
                            Đặt lại mật khẩu cho <strong>{resetPwModal.username}</strong>
                        </h3>
                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="form-label">Mật khẩu mới (ít nhất 6 ký tự)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nhập mật khẩu mới"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => { setResetPwModal(null); setNewPassword(''); }}>Hủy</button>
                            <button className="btn-primary" onClick={handleResetPassword}>
                                <KeyRound size={16} /> Đặt lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
