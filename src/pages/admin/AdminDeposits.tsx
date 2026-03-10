import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { DepositLog } from '../../types/admin';

export default function AdminDeposits() {
    const [deposits, setDeposits] = useState<DepositLog[]>([]);
    const [depositFilters, setDepositFilters] = useState({ from: '', to: '', user: '' });
    const [showDepositFilters, setShowDepositFilters] = useState(false);

    const loadDeposits = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/deposit-history', { params: depositFilters });
            if (data.success) setDeposits(data.data);
        } catch { toast.error('Không thể tải lịch sử nạp'); }
    }, [depositFilters]);

    useEffect(() => { loadDeposits(); }, []);

    const exportCsv = async () => {
        try {
            const { data } = await api.get('/admin/export/transactions', { responseType: 'blob' });
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transactions-export.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Lỗi xuất CSV'); }
    };

    return (
        <div className="admin-section">
            <div className="admin-toolbar">
                <button className={`btn-sm ${showDepositFilters ? 'btn-blue' : ''}`} onClick={() => setShowDepositFilters(v => !v)}>
                    <Filter size={14} /> Lọc
                </button>
                <button className="btn-sm" onClick={exportCsv} title="Xuất CSV">
                    <Download size={14} /> CSV
                </button>
            </div>
            {showDepositFilters && (
                <div className="filter-bar">
                    <input type="date" value={depositFilters.from} onChange={e => setDepositFilters(f => ({ ...f, from: e.target.value }))} />
                    <input type="date" value={depositFilters.to} onChange={e => setDepositFilters(f => ({ ...f, to: e.target.value }))} />
                    <input type="text" placeholder="Username..." value={depositFilters.user} onChange={e => setDepositFilters(f => ({ ...f, user: e.target.value }))} />
                    <button className="btn-sm btn-blue" onClick={loadDeposits}><Search size={14} /> Tìm</button>
                    <button className="btn-sm" onClick={() => { setDepositFilters({ from: '', to: '', user: '' }); }}><X size={14} /></button>
                </div>
            )}
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>User</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                            <th>Số tiền</th>
                            <th>Diễn tả</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deposits.map(d => (
                            <tr key={d.id}>
                                <td>{d.id}</td>
                                <td>
                                    <div className="td-bold">{d.username}</div>
                                </td>
                                <td className="td-date">{new Date(d.created_at).toLocaleString('vi-VN')}</td>
                                <td>Nạp ngân hàng</td>
                                <td>
                                    <div className="td-balance">+{d.amount.toLocaleString()}đ</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        = {d.balance_after.toLocaleString()}đ
                                    </div>
                                </td>
                                <td>{d.description}</td>
                            </tr>
                        ))}
                        {deposits.length === 0 && (
                            <tr>
                                <td colSpan={6} className="td-empty">Chưa có giao dịch nạp tiền nào</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
