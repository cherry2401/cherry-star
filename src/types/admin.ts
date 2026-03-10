export interface Stats {
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    totalDeposits: number;
    ordersToday: number;
    ordersThisWeek: number;
    failedRate: number;
    activeUsers7d: number;
}

export interface ChartPoint {
    date: string;
    revenue: number;
    orders: number;
    deposits: number;
}

export interface AdminUser {
    id: number;
    username: string;
    email: string | null;
    phone: string | null;
    display_name: string | null;
    balance: number;
    role: string;
    is_active: number;
    created_at: string;
    last_login_at: string | null;
    total_orders: number;
    total_spent: number;
}

export interface Order {
    id: number;
    service_id: string;
    package_name: string;
    quantity: number;
    sell_price: number;
    profit: number;
    status: string;
    created_at: string;
    username: string;
}

export interface DepositLog {
    id: number;
    created_at: string;
    amount: number;
    balance_after: number;
    description: string;
    username: string;
}

export interface PricingPackage {
    id: number;
    package_name: string;
    name: string;
    original_price: number;
    sell_price: number;
    min: number;
    max: number;
    notes: string;
    hidden: boolean;
    package_markup: number | null;
    fixed_price: number | null;
}

export interface PricingService {
    service_id: string;
    service_name: string;
    path: string;
    markup: number;
    packages: PricingPackage[];
}

export type Tab = 'stats' | 'users' | 'pricing' | 'orders' | 'deposits' | 'audit';
