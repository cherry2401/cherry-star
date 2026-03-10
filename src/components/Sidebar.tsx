import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    ThumbsUp, Heart, MessageCircleHeart, MessageSquareText,
    UserPlus, Flag, Users, Eye, Share2, Crown, Bookmark,
    LayoutDashboard, ClipboardList, X, Facebook, Instagram,
    Wallet, LogOut, Shield, ChevronDown
} from 'lucide-react';
import { TikTokIcon } from './TikTokIcon';
import { facebookServices, tiktokServices, instagramServices } from '../config/services';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceConfig } from '../types';

// Map icon string to component
const iconMap: Record<string, React.ElementType> = {
    ThumbsUp, Heart, MessageCircleHeart, MessageSquareText,
    UserPlus, Flag, Users, Eye, Share2, Crown, Bookmark,
    LayoutDashboard, ClipboardList, Facebook,
};

interface ServiceSectionProps {
    title: string;
    icon: React.ElementType;
    iconColor: string;
    services: ServiceConfig[];
    routePrefix: string;
    defaultExpanded: boolean;
    onLinkClick: () => void;
}

function ServiceSection({ title, icon: SectionIcon, iconColor, services, routePrefix, defaultExpanded, onLinkClick }: ServiceSectionProps) {
    const location = useLocation();
    const isActiveSection = location.pathname.startsWith(`/${routePrefix}/`);
    const [expanded, setExpanded] = useState(defaultExpanded || isActiveSection);

    return (
        <div className="sidebar-section sidebar-service-group">
            <button
                className={`sidebar-section-toggle ${expanded ? 'expanded' : ''}`}
                onClick={() => setExpanded(!expanded)}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SectionIcon size={13} style={{ color: iconColor }} />
                    {title}
                </span>
                <ChevronDown size={14} className="section-chevron" />
            </button>
            <div className={`sidebar-collapsible ${expanded ? 'open' : ''}`}>
                <nav className="sidebar-nav">
                    {services.map((service) => {
                        const Icon = iconMap[service.icon] || ThumbsUp;
                        return (
                            <NavLink
                                key={service.id}
                                to={`/${routePrefix}/${service.id}`}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={onLinkClick}
                            >
                                <Icon size={20} className="sidebar-link-icon" style={{ color: service.color }} />
                                {service.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
        onClose();
    };

    return (
        <>
            {/* Sidebar overlay for mobile */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center' }}>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                        <div className="sidebar-brand-icon" style={{ background: 'transparent', padding: 0 }}>
                            <img src="/logo.png" alt="CHERRY STAR" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        </div>
                        <div className="sidebar-brand-text">
                            <h1>CHERRY STAR</h1>
                            <span>Like Khắp Muôn Nơi</span>
                        </div>
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        className="sidebar-close-btn"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Dashboard */}
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Tổng quan</div>
                    <nav className="sidebar-nav">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <LayoutDashboard size={20} className="sidebar-link-icon" />
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/order-history"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <ClipboardList size={20} className="sidebar-link-icon" />
                            Nhật ký đơn hàng
                        </NavLink>
                        {isAuthenticated && (
                            <NavLink
                                to="/deposit"
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={onClose}
                            >
                                <Wallet size={20} className="sidebar-link-icon" style={{ color: '#22c55e' }} />
                                Nạp tiền
                            </NavLink>
                        )}
                    </nav>
                </div>

                {/* Facebook Services — expanded by default */}
                <ServiceSection
                    title="Facebook"
                    icon={Facebook}
                    iconColor="#3b82f6"
                    services={facebookServices}
                    routePrefix="facebook"
                    defaultExpanded={true}
                    onLinkClick={onClose}
                />

                {/* TikTok Services — collapsed by default */}
                <ServiceSection
                    title="TikTok"
                    icon={TikTokIcon}
                    iconColor="#ff2d55"
                    services={tiktokServices}
                    routePrefix="tiktok"
                    defaultExpanded={false}
                    onLinkClick={onClose}
                />

                {/* Instagram Services — collapsed by default */}
                <ServiceSection
                    title="Instagram"
                    icon={Instagram}
                    iconColor="#e1306c"
                    services={instagramServices}
                    routePrefix="instagram"
                    defaultExpanded={false}
                    onLinkClick={onClose}
                />

                {/* Account section */}
                {isAuthenticated && (
                    <div className="sidebar-section sidebar-bottom">
                        <div className="sidebar-section-title">Tài khoản</div>
                        <nav className="sidebar-nav">
                            {isAdmin && (
                                <NavLink
                                    to="/admin"
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={onClose}
                                >
                                    <Shield size={20} className="sidebar-link-icon" style={{ color: '#ef4444' }} />
                                    Admin Panel
                                </NavLink>
                            )}
                            <button className="sidebar-link logout-link" onClick={handleLogout}>
                                <LogOut size={20} className="sidebar-link-icon" />
                                Đăng xuất
                            </button>
                        </nav>
                    </div>
                )}
            </aside>
        </>
    );
}
