import axios from 'axios';
import type { PricesResponse, OrderLogsResponse } from '../types';

// API base URL: empty in dev (uses Vite proxy), set VITE_API_URL in production
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Get all available packages & prices (public, proxied through backend)
export async function getPackages(): Promise<PricesResponse> {
    const { data } = await api.get<PricesResponse>('/api/prices');
    return data;
}

// Buy a service (auth required, goes through backend with balance check)
export async function buyService(
    endpoint: string,
    body: Record<string, any>,
    serviceId: string
): Promise<any> {
    const { data } = await api.post('/api/orders', {
        ...body,
        endpoint,
        service_id: serviceId,
    });
    return data;
}

// Get order logs (proxied through BaoStar via backend)
export async function getOrderLogs(type: string, listIds: string): Promise<OrderLogsResponse> {
    const { data } = await api.post<OrderLogsResponse>('/api/logs-order', {
        type,
        list_ids: listIds,
    });
    return data;
}

// Convert Facebook link to numeric ID (public, proxied through backend)
export async function convertUid(link: string, type: string = 'like'): Promise<string> {
    const { data } = await api.post('/api/convert-uid', { link, type });
    if (typeof data === 'object' && data !== null) {
        const uid = data.data || data.id || data.uid || data.object_id;
        return String(uid ?? data);
    }
    return String(data);
}

export default api;
