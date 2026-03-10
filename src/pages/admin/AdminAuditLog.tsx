import { useState, useEffect, useCallback } from 'react';
import { FileText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface AuditEntry {
    id: number;
    admin_username: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, any>;
    ip_address: string;
    created_at: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
    deposit: 'Nạp tiền',
    adjust_balance: 'Chỉnh số dư',
    enable_user: 'Mở khóa user',
    disable_user: 'Khóa user',
    update_user: 'Cập nhật user',
    delete_user: 'Xóa user',
    change_pricing: 'Đổi hệ số giá',
    change_package_pricing: 'Đổi giá gói',
    export_data: 'Xuất dữ liệu',
};

export default function AdminAuditLog() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 });
    const [actionFilter, setActionFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const loadLogs = useCallback(async (page = 1) => {
        try {
            const params: any = { page, limit: 30 };
            if (actionFilter) params.action = actionFilter;
            const { data } = await api.get('/admin/audit-log', { params });
            if (data.success) {
                setLogs(data.data);
                setPagination(data.pagination);
            }
        } catch {
            toast.error('Không thể tải nhật ký');
        }
    }, [actionFilter]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const formatDetails = (details: Record<string, any>) => {
        const parts: string[] = [];
        if (details.username) parts.push(`user: ${details.username}`);
        if (details.amount !== undefined) parts.push(`${details.amount > 0 ? '+' : ''}${Number(details.amount).toLocaleString()}đ`);
        if (details.old_balance !== undefined) parts.push(`${Number(details.old_balance).toLocaleString()} → ${Number(details.new_balance).toLocaleString()}đ`);
        if (details.markup) parts.push(`×${details.markup}`);
        if (details.fixed_price !== undefined && details.fixed_price !== null) parts.push(`giá cố định: ${Number(details.fixed_price).toLocaleString()}đ`);
        if (details.package_name) parts.push(details.package_name);
        if (details.rows_count) parts.push(`${details.rows_count} dòng`);
        if (details.description) parts.push(details.description);
        return parts.join(' · ') || '—';
    };

    return (
        <div className="admin-section">
            <div className="admin-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} />
                    <strong>Nhật ký quản trị</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({pagination.total} bản ghi)</span>
                </div>
                <button className={`btn-sm ${showFilters ? 'btn-blue' : ''}`} onClick={() => setShowFilters(v => !v)}>
                    <Filter size={14} /> Lọc
                </button>
            </div>

            {showFilters && (
                <div className="filter-bar">
                    <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); }}>
                        <option value="">Tất cả hành động</option>
                        {Object.entries(ACTION_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Admin</th>
                            <th>Hành động</th>
                            <th>Đối tượng</th>
                            <th>Chi tiết</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="td-date">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                                <td className="td-bold">{log.admin_username}</td>
                                <td>
                                    <span className={`status-badge status-${log.action.includes('delete') || log.action.includes('disable') ? 'failed' : 'completed'}`}>
                                        {ACTION_LABELS[log.action] || log.action}
                                    </span>
                                </td>
                                <td>{log.target_type ? `${log.target_type}#${log.target_id}` : '—'}</td>
                                <td style={{ fontSize: 12, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={JSON.stringify(log.details)}>
                                    {formatDetails(log.details)}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan={6} className="td-empty">Chưa có nhật ký</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="pagination-bar">
                    <button
                        className="btn-sm"
                        disabled={pagination.page <= 1}
                        onClick={() => loadLogs(pagination.page - 1)}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="pagination-info">
                        Trang {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                        className="btn-sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => loadLogs(pagination.page + 1)}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
