/** Database row types for PostgreSQL query results */

export interface DbUser {
    id: number;
    username: string;
    email: string | null;
    phone: string | null;
    display_name: string | null;
    password_hash: string;
    balance: number;
    role: 'user' | 'admin';
    is_active: number;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
}

export interface DbOrder {
    id: number;
    user_id: number;
    baostar_order_id: number;
    service_id: string;
    package_name: string;
    object_id: string;
    quantity: number;
    cost_price: number;
    sell_price: number;
    profit: number;
    status: string;
    created_at: string;
}

export interface DbTransaction {
    id: number;
    user_id: number;
    type: 'deposit' | 'deduct' | 'purchase';
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
}

export interface DbPricingConfig {
    service_id: string;
    markup: number;
    updated_at: string;
}

export interface DbHiddenPackage {
    service_id: string;
    package_name: string;
    original_price: number;
}

export interface DbPackagePricing {
    service_id: string;
    package_name: string;
    original_price: number;
    markup: number;
    fixed_price: number | null;
}

export interface CountRow {
    count: number;
}

export interface TotalRow {
    total: number;
}
