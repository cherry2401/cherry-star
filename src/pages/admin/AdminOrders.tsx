import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { Order } from '../../types/admin';

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderFilters, setOrderFilters] = useState({ status: '', from: '', to: '', user: '' });
    const [showOrderFilters, setShowOrderFilters] = useState(false);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });

    const loadOrders = useCallback(async (page = 1) => {
        try {
            const { data } = await api.get('/admin/orders', { params: { ...orderFilters, page, limit: 50 } });
            if (data.success) {
                setOrders(data.data);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch { toast.error('Không thể tải đơn hàng'); }
    }, [orderFilters]);

    useEffect(() => { loadOrders(); }, []);

    const exportCsv = async () => {
        try {
            const { data } = await api.get('/admin/export/orders', { responseType: 'blob' });
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'orders-export.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Lỗi xuất CSV'); }
    };

    return (
        <div className="admin-section">
            <div className="admin-toolbar">
                <button className={`btn-sm ${showOrderFilters ? 'btn-blue' : ''}`} onClick={() => setShowOrderFilters(v => !v)}>
                    <Filter size={14} /> Lọc
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
                        {pagination.total} đơn
                    </span>
                    <button className="btn-sm" onClick={exportCsv} title="Xuất CSV">
                        <Download size={14} /> CSV
                    </button>
                </div>
            </div>
            {showOrderFilters && (
                <div className="filter-bar">
                    <select value={orderFilters.status} onChange={e => setOrderFilters(f => ({ ...f, status: e.target.value }))}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                    <input type="date" value={orderFilters.from} onChange={e => setOrderFilters(f => ({ ...f, from: e.target.value }))} />
                    <input type="date" value={orderFilters.to} onChange={e => setOrderFilters(f => ({ ...f, to: e.target.value }))} />
                    <input type="text" placeholder="Username..." value={orderFilters.user} onChange={e => setOrderFilters(f => ({ ...f, user: e.target.value }))} />
                    <button className="btn-sm btn-blue" onClick={() => loadOrders()}><Search size={14} /> Tìm</button>
                    <button className="btn-sm" onClick={() => { setOrderFilters({ status: '', from: '', to: '', user: '' }); }}><X size={14} /></button>
                </div>
            )}
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Dịch vụ</th>
                            <th>Gói</th>
                            <th>Giá bán</th>
                            <th>Lợi nhuận</th>
                            <th>Trạng thái</th>
                            <th>Thời gian</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td className="td-bold">{o.username}</td>
                                <td>{o.service_id}</td>
                                <td>{o.package_name}</td>
                                <td className="td-balance">{o.sell_price.toLocaleString()}đ</td>
                                <td className="td-profit">{o.profit.toLocaleString()}đ</td>
                                <td>
                                    <span className={`status-badge status-${o.status}`}>{o.status}</span>
                                </td>
                                <td className="td-date">{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr><td colSpan={8} className="td-empty">Chưa có đơn hàng</td></tr>
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
                        onClick={() => loadOrders(pagination.page - 1)}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="pagination-info">
                        Trang {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                        className="btn-sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => loadOrders(pagination.page + 1)}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
