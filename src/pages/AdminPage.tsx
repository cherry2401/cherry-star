import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wallet, Settings, ShoppingCart, TrendingUp, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Tab } from '../types/admin';
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import AdminOrders from './admin/AdminOrders';
import AdminPricing from './admin/AdminPricing';
import AdminDeposits from './admin/AdminDeposits';
import AdminAuditLog from './admin/AdminAuditLog';

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'stats', label: 'Thống kê', icon: TrendingUp },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'deposits', label: 'Lịch sử nạp', icon: Wallet },
    { key: 'pricing', label: 'Cấu hình giá', icon: Settings },
    { key: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
    { key: 'audit', label: 'Nhật ký', icon: FileText },
];

export default function AdminPage() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('stats');

    useEffect(() => {
        if (!isAdmin) navigate('/');
    }, [isAdmin]);

    return (
        <div className="admin-page fade-in">
            {/* Tab nav */}
            <div className="admin-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`admin-tab ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'stats' && <AdminDashboard />}
            {tab === 'users' && <AdminUsers />}
            {tab === 'deposits' && <AdminDeposits />}
            {tab === 'pricing' && <AdminPricing />}
            {tab === 'orders' && <AdminOrders />}
            {tab === 'audit' && <AdminAuditLog />}
        </div>
    );
}
