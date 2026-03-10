import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonTable } from '../components/Skeleton';
import { PlatformLink } from '../utils/platformLink';

interface Order {
    id: number;
    service_id: string;
    package_name: string;
    display_name: string | null;
    object_id: string;
    sell_price: number;
    status: string;
    baostar_order_id: number | null;
    created_at: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function OrderHistory() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

    const loadOrders = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const { data } = await api.get('/api/orders', { params });
            if (data.success) {
                setOrders(data.data);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch {
            toast.error('Không thể tải lịch sử đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        if (isAuthenticated) loadOrders();
    }, [isAuthenticated, loadOrders]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'processing': return 'status-processing';
            case 'failed': case 'refunded': return 'status-failed';
            default: return 'status-processing';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'Hoàn thành';
            case 'processing': return 'Đang xử lý';
            case 'failed': return 'Thất bại';
            case 'refunded': return 'Đã hoàn tiền';
            default: return status;
        }
    };

    const handleReorder = (order: Order) => {
        const serviceId = order.service_id;
        let platform = 'facebook';
        if (serviceId.includes('tiktok') || serviceId.startsWith('tiktok')) platform = 'tiktok';
        else if (serviceId.includes('instagram') || serviceId.startsWith('instagram')) platform = 'instagram';
        navigate(`/${platform}/${serviceId}?reorder=${encodeURIComponent(order.object_id)}`);
    };

    // Client-side search on top of server-side pagination
    const filtered = orders.filter(o =>
        o.service_id.toLowerCase().includes(search.toLowerCase()) ||
        o.object_id.includes(search) ||
        String(o.id).includes(search)
    );

    if (!isAuthenticated) {
        return (
            <div className="empty-state fade-in">
                <ClipboardList size={64} className="empty-state-icon" />
                <h3>Đăng nhập để xem</h3>
                <p>Bạn cần đăng nhập để xem lịch sử đơn hàng</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Toolbar */}
            <div className="admin-section" style={{ marginBottom: 20 }}>
                <div className="admin-toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="admin-search" style={{ flex: 1, minWidth: 200 }}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo ID, dịch vụ, object..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-input"
                        style={{ width: 'auto', minWidth: 140, padding: '6px 10px', fontSize: 13 }}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="processing">Đang xử lý</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="failed">Thất bại</option>
                        <option value="refunded">Đã hoàn tiền</option>
                    </select>
                    <button className="btn-sm btn-blue" onClick={() => loadOrders()} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="admin-section">
                    <SkeletonTable rows={5} cols={7} />
                </div>
            ) : filtered.length > 0 ? (
                <div className="admin-section">
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Dịch vụ</th>
                                    <th>Gói</th>
                                    <th>Object ID</th>
                                    <th>Giá</th>
                                    <th>Trạng thái</th>
                                    <th>Thời gian</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(o => (
                                    <tr key={o.id}>
                                        <td className="td-bold">#{o.id}</td>
                                        <td>{o.service_id}</td>
                                        <td>{o.display_name || o.package_name}</td>
                                        <td>
                                            <PlatformLink serviceId={o.service_id} objectId={o.object_id} />
                                        </td>
                                        <td className="td-balance">{o.sell_price.toLocaleString()}đ</td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(o.status)}`}>
                                                {getStatusText(o.status)}
                                            </span>
                                        </td>
                                        <td className="td-date">{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                                        <td>
                                            <button
                                                className="btn-sm btn-blue"
                                                onClick={() => handleReorder(o)}
                                                title="Mua lại dịch vụ này"
                                            >
                                                <RotateCcw size={13} /> Mua lại
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
                                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đơn)
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
            ) : (
                <div className="empty-state">
                    <ClipboardList size={64} className="empty-state-icon" />
                    <h3>{search ? 'Không tìm thấy' : 'Chưa có đơn hàng'}</h3>
                    <p>{search ? 'Thử tìm kiếm khác' : 'Đơn hàng sẽ xuất hiện ở đây sau khi bạn mua dịch vụ'}</p>
                </div>
            )}
        </div>
    );
}
