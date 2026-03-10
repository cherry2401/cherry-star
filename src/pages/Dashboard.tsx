import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ThumbsUp, Heart, MessageCircleHeart, MessageSquareText,
    UserPlus, Flag, Users, Eye, Share2, Crown,
    TrendingUp, ShoppingCart, CheckCircle, Clock,
    Facebook, Play, Bookmark, MessageCircle, Radio, Tv, Instagram
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TikTokIcon } from '../components/TikTokIcon';
import { facebookServices, tiktokServices, instagramServices } from '../config/services';

const iconMap: Record<string, React.ElementType> = {
    ThumbsUp, Heart, MessageCircleHeart, MessageSquareText,
    UserPlus, Flag, Users, Eye, Share2, Crown,
    Play, Bookmark, MessageCircle, Radio, Tv,
};

interface UserStats {
    total_orders: number;
    completed_orders: number;
    processing_orders: number;
    failed_orders: number;
    total_spent: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            api.get('/api/orders/stats')
                .then(({ data }) => {
                    if (data.success) setStats(data.data);
                })
                .catch(() => { /* silent */ });
        }
    }, [isAuthenticated]);

    return (
        <div className="fade-in">
            {/* Stats */}
            <div className="dashboard-stats">
                <div className="stat-card" style={{ '--card-accent': 'var(--accent-blue)', '--icon-bg': 'rgba(59,130,246,0.1)', '--icon-color': 'var(--accent-blue)' } as React.CSSProperties}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon"><ShoppingCart size={22} /></div>
                    </div>
                    <div className="stat-card-value">{stats?.total_orders ?? '—'}</div>
                    <div className="stat-card-label">Tổng đơn hàng</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--accent-green)', '--icon-bg': 'rgba(16,185,129,0.1)', '--icon-color': 'var(--accent-green)' } as React.CSSProperties}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon"><CheckCircle size={22} /></div>
                    </div>
                    <div className="stat-card-value">{stats?.completed_orders ?? '—'}</div>
                    <div className="stat-card-label">Đơn hoàn thành</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--accent-orange)', '--icon-bg': 'rgba(249,115,22,0.1)', '--icon-color': 'var(--accent-orange)' } as React.CSSProperties}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon"><Clock size={22} /></div>
                    </div>
                    <div className="stat-card-value">{stats?.processing_orders ?? '—'}</div>
                    <div className="stat-card-label">Đang xử lý</div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--accent-purple)', '--icon-bg': 'rgba(139,92,246,0.1)', '--icon-color': 'var(--accent-purple)' } as React.CSSProperties}>
                    <div className="stat-card-header">
                        <div className="stat-card-icon"><TrendingUp size={22} /></div>
                    </div>
                    <div className="stat-card-value">{facebookServices.length + tiktokServices.length + instagramServices.length}</div>
                    <div className="stat-card-label">Dịch vụ khả dụng</div>
                </div>
            </div>

            {/* Services Grid */}
            {/* Facebook Services */}
            <h3 className="services-section-title">
                <Facebook size={22} style={{ color: '#3b82f6' }} />
                Dịch vụ Facebook
            </h3>
            <div className="services-grid">
                {facebookServices.map((service) => {
                    const Icon = iconMap[service.icon] || ThumbsUp;
                    return (
                        <button
                            key={service.id}
                            className="service-card"
                            onClick={() => navigate(`/facebook/${service.id}`)}
                            style={{ '--card-color': service.color } as React.CSSProperties}
                        >
                            <div
                                className="service-card-icon"
                                style={{
                                    background: `${service.color}18`,
                                    color: service.color,
                                }}
                            >
                                <Icon size={24} />
                            </div>
                            <div className="service-card-name">{service.name}</div>
                            <div className="service-card-desc">{service.description}</div>
                        </button>
                    );
                })}
            </div>

            {/* TikTok Services */}
            <h3 className="services-section-title">
                <TikTokIcon size={22} style={{ color: '#ff2d55' }} />
                Dịch vụ TikTok
            </h3>
            <div className="services-grid">
                {tiktokServices.map((service) => {
                    const Icon = iconMap[service.icon] || Heart;
                    return (
                        <button
                            key={service.id}
                            className="service-card"
                            onClick={() => navigate(`/tiktok/${service.id}`)}
                            style={{ '--card-color': service.color } as React.CSSProperties}
                        >
                            <div
                                className="service-card-icon"
                                style={{
                                    background: `${service.color}18`,
                                    color: service.color,
                                }}
                            >
                                <Icon size={24} />
                            </div>
                            <div className="service-card-name">{service.name}</div>
                            <div className="service-card-desc">{service.description}</div>
                        </button>
                    );
                })}
            </div>

            {/* Instagram Services */}
            <h3 className="services-section-title">
                <Instagram size={22} style={{ color: '#e1306c' }} />
                Dịch vụ Instagram
            </h3>
            <div className="services-grid">
                {instagramServices.map((service) => {
                    const Icon = iconMap[service.icon] || Heart;
                    return (
                        <button
                            key={service.id}
                            className="service-card"
                            onClick={() => navigate(`/instagram/${service.id}`)}
                            style={{ '--card-color': service.color } as React.CSSProperties}
                        >
                            <div
                                className="service-card-icon"
                                style={{
                                    background: `${service.color}18`,
                                    color: service.color,
                                }}
                            >
                                <Icon size={24} />
                            </div>
                            <div className="service-card-name">{service.name}</div>
                            <div className="service-card-desc">{service.description}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
