import { useState, useEffect } from 'react';
import {
    ShoppingCart, TrendingUp, DollarSign, UserCheck, Wallet, BarChart3,
    CalendarDays, AlertTriangle, UserCog
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { Stats, ChartPoint } from '../../types/admin';

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d'>('7d');

    useEffect(() => {
        loadStats();
        loadChart('7d');
    }, []);

    const loadStats = async () => {
        try {
            const { data } = await api.get('/admin/stats');
            if (data.success) setStats(data.data);
        } catch { toast.error('Không thể tải thống kê'); }
    };

    const loadChart = async (range: '7d' | '30d' | '90d') => {
        try {
            setChartRange(range);
            const { data } = await api.get('/admin/stats/chart', { params: { range } });
            if (data.success) setChartData(data.data);
        } catch { /* silent */ }
    };

    if (!stats) return <div className="td-empty" style={{ padding: 40, textAlign: 'center' }}>Đang tải thống kê...</div>;

    return (
        <>
            {/* Primary Stats */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <UserCheck size={28} className="stat-icon blue" />
                    <div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Tổng Users</div></div>
                </div>
                <div className="admin-stat-card">
                    <ShoppingCart size={28} className="stat-icon purple" />
                    <div><div className="stat-value">{stats.totalOrders}</div><div className="stat-label">Tổng Đơn</div></div>
                </div>
                <div className="admin-stat-card">
                    <DollarSign size={28} className="stat-icon green" />
                    <div><div className="stat-value">{stats.totalRevenue.toLocaleString()}đ</div><div className="stat-label">Doanh thu</div></div>
                </div>
                <div className="admin-stat-card">
                    <TrendingUp size={28} className="stat-icon orange" />
                    <div><div className="stat-value">{stats.totalProfit.toLocaleString()}đ</div><div className="stat-label">Lợi nhuận</div></div>
                </div>
                <div className="admin-stat-card">
                    <Wallet size={28} className="stat-icon teal" />
                    <div><div className="stat-value">{stats.totalDeposits.toLocaleString()}đ</div><div className="stat-label">Tổng nạp</div></div>
                </div>
            </div>

            {/* Operational Stats */}
            <div className="admin-stats-grid" style={{ marginTop: 10 }}>
                <div className="admin-stat-card">
                    <CalendarDays size={24} className="stat-icon blue" />
                    <div><div className="stat-value">{stats.ordersToday}</div><div className="stat-label">Đơn hôm nay</div></div>
                </div>
                <div className="admin-stat-card">
                    <ShoppingCart size={24} className="stat-icon purple" />
                    <div><div className="stat-value">{stats.ordersThisWeek}</div><div className="stat-label">Đơn 7 ngày</div></div>
                </div>
                <div className="admin-stat-card">
                    <AlertTriangle size={24} className={`stat-icon ${stats.failedRate > 10 ? 'red' : 'green'}`} />
                    <div><div className="stat-value">{stats.failedRate}%</div><div className="stat-label">Tỉ lệ lỗi</div></div>
                </div>
                <div className="admin-stat-card">
                    <UserCog size={24} className="stat-icon teal" />
                    <div><div className="stat-value">{stats.activeUsers7d}</div><div className="stat-label">User hoạt động (7 ngày)</div></div>
                </div>
            </div>

            {/* Chart */}
            <div className="admin-section" style={{ marginTop: 24 }}>
                <div className="admin-toolbar" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart3 size={18} />
                        <strong>Biểu đồ</strong>
                    </div>
                    <div className="chart-range-btns">
                        {(['7d', '30d', '90d'] as const).map(r => (
                            <button
                                key={r}
                                className={`btn-sm ${chartRange === r ? 'btn-blue' : ''}`}
                                onClick={() => loadChart(r)}
                            >
                                {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : '90 ngày'}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                                stroke="var(--text-muted)"
                                fontSize={12}
                            />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                                labelFormatter={v => new Date(v).toLocaleDateString('vi-VN')}
                                formatter={(value: any, name: any) => [Number(value).toLocaleString() + 'đ', name === 'revenue' ? 'Doanh thu' : name === 'deposits' ? 'Nạp tiền' : 'Đơn hàng']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" strokeWidth={2} />
                            <Area type="monotone" dataKey="deposits" stroke="#10b981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}
