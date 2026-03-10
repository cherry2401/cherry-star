// ============================================
// BaoStar API Types
// ============================================

export interface PackageConfig {
    reaction?: boolean;
    multiple_reaction?: boolean;
}

export interface Package {
    id: number;
    name: string;
    package_name: string;
    price_per: number;
    min?: number;
    max?: number;
    notes?: string;
    config?: PackageConfig;
}

export interface ServiceCategory {
    name: string;
    path: string;
    url_api: string;
    package: Package[];
}

export interface PricesResponse {
    status: number;
    data: ServiceCategory[];
    error: string[];
    success: boolean;
    message: string;
}

export interface BuyRequest {
    object_id: string;
    quantity?: number;
    object_type?: string;
    package_name: string;
    display_name?: string;
    list_message?: string;
    num_minutes?: number;
    num_day?: number;
    slbv?: string;
    fb_name?: string;
}

export interface OrderResponse {
    status: number;
    data: {
        id: number;
    };
    error: string[];
    success: boolean;
    message: string;
    hold_coin: boolean;
}

export interface OrderLog {
    id: number;
    start_like: number;
    status: 'done' | 'processing' | 'canceled' | 'error';
    count_is_run: number | null;
    object_id: string;
    quantity: number;
}

export interface OrderLogsResponse {
    data: OrderLog[];
    success: boolean;
    status: number;
    message: string;
}

// ============================================
// UI Types
// ============================================

export interface ServiceConfig {
    id: string;
    name: string;
    description: string;
    endpoint: string;
    icon: string;
    color: string;
    fields: FieldConfig[];
}

export interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select' | 'reaction';
    placeholder: string;
    required: boolean;
    min?: number;
}

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: string;
}
