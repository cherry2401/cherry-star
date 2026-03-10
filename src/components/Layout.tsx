import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { facebookServices, tiktokServices, instagramServices } from '../config/services';

const allServices = [...facebookServices, ...tiktokServices, ...instagramServices];

function getPageInfo(pathname: string) {
    if (pathname === '/') return { title: 'Dashboard', subtitle: 'Tổng quan dịch vụ' };
    if (pathname === '/order-history') return { title: 'Nhật ký đơn hàng', subtitle: 'Theo dõi trạng thái đơn' };
    if (pathname === '/deposit') return { title: 'Nạp tiền', subtitle: 'Nạp tiền vào tài khoản' };
    if (pathname === '/account') return { title: 'Tài khoản', subtitle: 'Quản lý thông tin cá nhân' };
    if (pathname === '/admin') return { title: 'Admin Panel', subtitle: 'Quản trị hệ thống' };

    // Match /:platform/:serviceId
    const match = pathname.match(/^\/(facebook|tiktok|instagram)\/(.+)$/);
    if (match) {
        const serviceId = match[2];
        const service = allServices.find(s => s.id === serviceId);
        if (service) return { title: service.name, subtitle: service.description };
    }

    return { title: 'CHERRY STAR', subtitle: '' };
}

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const pageInfo = getPageInfo(location.pathname);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="main-content">
                <Header
                    title={pageInfo.title}
                    subtitle={pageInfo.subtitle}
                    onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                />
                <div className="page-content fade-in" key={location.pathname}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
