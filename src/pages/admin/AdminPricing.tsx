import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronRight, Eye, EyeOff, Facebook, Music, Instagram
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { PricingService } from '../../types/admin';

export default function AdminPricing() {
    const [pricingDetail, setPricingDetail] = useState<PricingService[]>([]);
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
    const [pricingPlatform, setPricingPlatform] = useState<'all' | 'facebook' | 'tiktok' | 'instagram'>('facebook');
    const [pricingMode, setPricingMode] = useState<'multiplier' | 'percent'>('multiplier');

    useEffect(() => { loadPricingDetail(); }, []);

    const loadPricingDetail = async () => {
        try {
            const { data } = await api.get('/admin/pricing-detail');
            if (data.success) setPricingDetail(data.data);
        } catch { toast.error('Không thể tải cấu hình giá'); }
    };

    const updateMarkup = async (serviceId: string, newMarkup: number) => {
        if (newMarkup < 1) { toast.error('Hệ số phải >= 1'); return; }
        try {
            const { data } = await api.put(`/admin/pricing/${serviceId}`, { markup: newMarkup });
            if (data.success) {
                toast.success(data.message);
                loadPricingDetail();
            }
        } catch { toast.error('Lỗi cập nhật markup'); }
    };

    const updatePackagePrice = async (serviceId: string, packageName: string, originalPrice: number, fixedPriceValue: string) => {
        if (!fixedPriceValue || fixedPriceValue.trim() === '') {
            // Clear fixed price — remove override
            try {
                await api.delete('/admin/package-pricing', { data: { service_id: serviceId, package_name: packageName, original_price: originalPrice } });
                toast.success('Đã xóa giá cố định — dùng lại markup');
                loadPricingDetail();
            } catch { toast.error('Lỗi xóa giá cố định'); }
            return;
        }
        const fixedPrice = parseInt(fixedPriceValue);
        if (isNaN(fixedPrice) || fixedPrice < 0) { toast.error('Giá bán phải là số dương'); return; }
        try {
            const { data } = await api.put('/admin/package-pricing', {
                service_id: serviceId,
                package_name: packageName,
                original_price: originalPrice,
                markup: 1,
                fixed_price: fixedPrice,
            });
            if (data.success) {
                toast.success(data.message);
                loadPricingDetail();
            }
        } catch { toast.error('Lỗi cập nhật giá bán'); }
    };

    const togglePackage = async (serviceId: string, packageName: string, originalPrice: number, currentHidden: boolean) => {
        try {
            const { data } = await api.post('/admin/toggle-package', {
                service_id: serviceId,
                package_name: packageName,
                original_price: originalPrice,
                hidden: !currentHidden,
            });
            if (data.success) {
                toast.success(data.message);
                setPricingDetail(prev => prev.map(s =>
                    s.service_id === serviceId
                        ? {
                            ...s,
                            packages: s.packages.map(p =>
                                p.package_name === packageName && p.original_price === originalPrice ? { ...p, hidden: !currentHidden } : p
                            ),
                        }
                        : s
                ));
            }
        } catch { toast.error('Lỗi toggle gói'); }
    };

    const toggleExpand = (serviceId: string) => {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) next.delete(serviceId);
            else next.add(serviceId);
            return next;
        });
    };

    // Pricing display helpers
    const markupToPercent = (m: number) => Math.round((m - 1) * 100);
    const percentToMarkup = (p: number) => 1 + p / 100;
    const formatMarkup = (m: number) => pricingMode === 'multiplier' ? `×${m}` : `+${markupToPercent(m)}%`;

    const renderServices = (services: PricingService[]) => services.map(svc => {
        const isExpanded = expandedServices.has(svc.service_id);
        const activeCount = svc.packages.filter(p => !p.hidden).length;
        const totalCount = svc.packages.length;

        return (
            <div key={svc.service_id} className="pricing-service-card">
                {/* Service header */}
                <div className="pricing-service-header" onClick={() => toggleExpand(svc.service_id)}>
                    <div className="pricing-service-left">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <div>
                            <div className="pricing-service-name">{svc.service_name}</div>
                            <div className="pricing-service-meta">
                                {activeCount}/{totalCount} gói đang bật · Markup: {formatMarkup(svc.markup)}
                            </div>
                        </div>
                    </div>
                    <div className="pricing-markup-control" onClick={e => e.stopPropagation()}>
                        <label>{pricingMode === 'multiplier' ? 'Hệ số ×' : 'Phần trăm %'}</label>
                        {pricingMode === 'multiplier' ? (
                            <input
                                type="number"
                                step="0.05"
                                min="1"
                                max="5"
                                className="markup-input"
                                defaultValue={svc.markup}
                                key={`m-${svc.service_id}`}
                                onBlur={e => {
                                    const v = parseFloat(e.target.value);
                                    if (!isNaN(v) && v !== svc.markup) updateMarkup(svc.service_id, v);
                                }}
                            />
                        ) : (
                            <input
                                type="number"
                                step="5"
                                min="0"
                                max="400"
                                className="markup-input"
                                defaultValue={markupToPercent(svc.markup)}
                                key={`p-${svc.service_id}`}
                                onBlur={e => {
                                    const pct = parseFloat(e.target.value);
                                    if (!isNaN(pct)) {
                                        const m = percentToMarkup(pct);
                                        if (m !== svc.markup) updateMarkup(svc.service_id, m);
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Package list */}
                {isExpanded && (
                    <div className="pricing-packages">
                        <table className="admin-table pricing-table">
                            <thead>
                                <tr>
                                    <th>Gói</th>
                                    <th>Giá gốc</th>
                                    <th>Giá bán (hiện tại)</th>
                                    <th>Giá bán tùy chỉnh</th>
                                    <th>Min / Max</th>
                                    <th>Hiển thị</th>
                                </tr>
                            </thead>
                            <tbody>
                                {svc.packages.map(pkg => (
                                    <tr key={`${pkg.package_name}-${pkg.original_price}`} className={pkg.hidden ? 'row-hidden' : ''}>
                                        <td className="td-bold">{pkg.package_name}</td>
                                        <td className="td-original-price">{pkg.original_price.toLocaleString()}đ</td>
                                        <td className="td-sell-price">
                                            {pkg.sell_price.toLocaleString()}đ
                                            {pkg.fixed_price !== null ? (
                                                <span style={{ fontSize: 10, color: 'var(--accent-green, #10b981)', marginLeft: 4, fontWeight: 600 }}>
                                                    (cố định)
                                                </span>
                                            ) : pkg.package_markup !== null ? (
                                                <span style={{ fontSize: 11, color: 'var(--accent-blue)', marginLeft: 4 }}>
                                                    ({formatMarkup(pkg.package_markup)})
                                                </span>
                                            ) : null}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                className="markup-input markup-input-sm"
                                                placeholder="— (dùng markup)"
                                                defaultValue={pkg.fixed_price ?? ''}
                                                key={`fp-${svc.service_id}-${pkg.package_name}-${pkg.original_price}-${pkg.fixed_price}`}
                                                onBlur={e => {
                                                    const newVal = e.target.value;
                                                    const currentVal = pkg.fixed_price;
                                                    if (newVal === '' && currentVal !== null) {
                                                        updatePackagePrice(svc.service_id, pkg.package_name, pkg.original_price, '');
                                                    } else if (newVal !== '' && parseInt(newVal) !== currentVal) {
                                                        updatePackagePrice(svc.service_id, pkg.package_name, pkg.original_price, newVal);
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="td-minmax">{pkg.min?.toLocaleString()} – {pkg.max?.toLocaleString()}</td>
                                        <td>
                                            <button
                                                className={`btn-toggle ${pkg.hidden ? 'off' : 'on'}`}
                                                onClick={() => togglePackage(svc.service_id, pkg.package_name, pkg.original_price, pkg.hidden)}
                                                title={pkg.hidden ? 'Đang ẩn — Click để hiện' : 'Đang hiện — Click để ẩn'}
                                            >
                                                {pkg.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                                {pkg.hidden ? 'Ẩn' : 'Hiện'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    });

    const fbServices = pricingDetail.filter(s => s.path.startsWith('/facebook'));
    const tkServices = pricingDetail.filter(s => s.path.startsWith('/tiktok'));
    const igServices = pricingDetail.filter(s => s.path.startsWith('/instagram'));

    const showFb = pricingPlatform === 'all' || pricingPlatform === 'facebook';
    const showTk = pricingPlatform === 'all' || pricingPlatform === 'tiktok';
    const showIg = pricingPlatform === 'all' || pricingPlatform === 'instagram';

    return (
        <div className="admin-section pricing-detail-section">
            {/* Markup mode toggle + Platform sub-tabs */}
            <div className="pricing-top-bar">
                <div className="pricing-platform-tabs">
                    <button
                        className={`pricing-platform-tab ${pricingPlatform === 'all' ? 'active' : ''}`}
                        onClick={() => setPricingPlatform('all')}
                    >
                        Tất cả
                    </button>
                    <button
                        className={`pricing-platform-tab ${pricingPlatform === 'facebook' ? 'active' : ''}`}
                        onClick={() => setPricingPlatform('facebook')}
                    >
                        <Facebook size={14} /> Facebook
                    </button>
                    <button
                        className={`pricing-platform-tab ${pricingPlatform === 'tiktok' ? 'active' : ''}`}
                        onClick={() => setPricingPlatform('tiktok')}
                    >
                        <Music size={14} /> TikTok
                    </button>
                    <button
                        className={`pricing-platform-tab ${pricingPlatform === 'instagram' ? 'active' : ''}`}
                        onClick={() => setPricingPlatform('instagram')}
                    >
                        <Instagram size={14} /> Instagram
                    </button>
                </div>
                <div className="pricing-mode-toggle">
                    <button
                        className={`btn-sm ${pricingMode === 'multiplier' ? 'btn-blue' : ''}`}
                        onClick={() => setPricingMode('multiplier')}
                    >
                        ×1.5
                    </button>
                    <button
                        className={`btn-sm ${pricingMode === 'percent' ? 'btn-blue' : ''}`}
                        onClick={() => setPricingMode('percent')}
                    >
                        +50%
                    </button>
                </div>
            </div>

            {pricingDetail.length === 0 && (
                <div className="td-empty" style={{ padding: 40, textAlign: 'center' }}>Đang tải giá từ BaoStar...</div>
            )}

            {showFb && fbServices.length > 0 && (
                <>
                    {pricingPlatform === 'all' && (
                        <div className="pricing-group-header">
                            <Facebook size={16} /> Facebook
                            <span className="pricing-group-count">{fbServices.length} dịch vụ</span>
                        </div>
                    )}
                    {renderServices(fbServices)}
                </>
            )}
            {showTk && tkServices.length > 0 && (
                <>
                    {pricingPlatform === 'all' && (
                        <div className="pricing-group-header">
                            <Music size={16} /> TikTok
                            <span className="pricing-group-count">{tkServices.length} dịch vụ</span>
                        </div>
                    )}
                    {renderServices(tkServices)}
                </>
            )}
            {showIg && igServices.length > 0 && (
                <>
                    {pricingPlatform === 'all' && (
                        <div className="pricing-group-header">
                            <Instagram size={16} /> Instagram
                            <span className="pricing-group-count">{igServices.length} dịch vụ</span>
                        </div>
                    )}
                    {renderServices(igServices)}
                </>
            )}
        </div>
    );
}
