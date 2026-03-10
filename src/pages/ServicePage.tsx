import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Send, CheckCircle, AlertCircle, Loader2, Info, Wallet, User, CreditCard,
    Package as PackageIcon, ClipboardList, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { facebookServices, tiktokServices, instagramServices } from '../config/services';
import { buyService, getPackages, convertUid } from '../services/api';
import api from '../services/api';
import type { Package, BuyRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PlatformLink } from '../utils/platformLink';
import { SkeletonPackageList } from '../components/Skeleton';

const isFacebookUrl = (val: string) => /^https?:\/\/(www\.|m\.|mbasic\.)?facebook\.com\//i.test(val);

const allServices = [...facebookServices, ...tiktokServices, ...instagramServices];

export default function ServicePage() {
    const { serviceId } = useParams<{ serviceId: string }>();
    const service = allServices.find(s => s.id === serviceId);
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState<Record<string, string>>({});
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [result, setResult] = useState<{ success: boolean; message: string; orderId?: number } | null>(null);
    const [converting, setConverting] = useState(false);
    const [totalDeposit, setTotalDeposit] = useState(0);
    const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
    const [serviceOrders, setServiceOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Pre-fill object_id from re-order link
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const reorderObjectId = params.get('reorder');
        if (reorderObjectId) {
            setFormData(prev => ({ ...prev, object_id: reorderObjectId }));
        }
    }, [location.search]);

    // Fetch total deposits for sidebar
    useEffect(() => {
        if (isAuthenticated) {
            api.get('/api/orders/stats').then(res => {
                if (res.data?.success) setTotalDeposit(res.data.data.total_deposits || 0);
            }).catch(() => { });
        }
    }, [isAuthenticated]);

    // Fetch service-specific order history
    const loadServiceOrders = async () => {
        if (!isAuthenticated || !serviceId) return;
        setLoadingOrders(true);
        try {
            const { data } = await api.get('/api/orders', { params: { service_id: serviceId } });
            if (data.success) setServiceOrders(data.data);
        } catch { /* silent */ }
        finally { setLoadingOrders(false); }
    };

    useEffect(() => {
        if (activeTab === 'history') loadServiceOrders();
    }, [activeTab, serviceId]);
    // Fetch packages on mount
    useEffect(() => {
        setFormData({});
        setSelectedPackage('');
        setResult(null);
        setLoadingPackages(true);

        getPackages()
            .then(res => {
                if (res.success && service) {
                    const servicePath = service.endpoint.replace('/api/', '/').replace('/buy', '');
                    const category = res.data.find(c => c.path === servicePath);
                    if (category) {
                        // Sort: S1/S3 (clone) packages first, then others
                        const sorted = [...category.package].sort((a, b) => {
                            const aClone = /clone|^s\d/i.test(a.name);
                            const bClone = /clone|^s\d/i.test(b.name);
                            if (aClone && !bClone) return -1;
                            if (!aClone && bClone) return 1;
                            return 0;
                        });
                        setPackages(sorted);
                        if (category.package.length > 0) {
                            setSelectedPackage(category.package[0].package_name);
                        }
                    } else {
                        setPackages([]);
                    }
                }
            })
            .catch(() => {
                // Use demo data if API not available
                setPackages([
                    { id: 1, name: 'Gói mặc định', package_name: 'default', price_per: 0 }
                ]);
                setSelectedPackage('default');
            })
            .finally(() => setLoadingPackages(false));
    }, [serviceId]);

    if (!service) {
        return (
            <div className="empty-state">
                <AlertCircle size={64} className="empty-state-icon" />
                <h3>Dịch vụ không tồn tại</h3>
                <p>Vui lòng chọn dịch vụ từ menu bên trái</p>
            </div>
        );
    }

    /** Strip query params from TikTok/Instagram URLs for cleaner display */
    const cleanSocialUrl = (url: string): string => {
        try {
            const parsed = new URL(url);
            // Remove all query params and hash
            return parsed.origin + parsed.pathname.replace(/\/$/, '');
        } catch {
            return url;
        }
    };

    const isTikTokUrl = (val: string) => /^https?:\/\/(www\.|vm\.)?tiktok\.com\//i.test(val);
    const isInstagramUrl = (val: string) => /^https?:\/\/(www\.)?instagram\.com\//i.test(val);

    const handleObjectIdChange = async (value: string) => {
        setFormData(prev => ({ ...prev, object_id: value }));

        // Facebook: convert URL to UID
        if (isFacebookUrl(value)) {
            setConverting(true);
            try {
                const followServices = ['vip', 'follow', 'like-page', 'mem-group'];
                const convertType = followServices.includes(service?.id || '') ? 'follow' : 'like';
                const uid = await convertUid(value, convertType);
                if (uid && uid !== '0' && uid !== 'null') {
                    setFormData(prev => ({ ...prev, object_id: uid }));
                    toast.success(`✅ Đã lấy ID: ${uid}`);
                } else {
                    toast.error('Không tìm thấy ID từ link này');
                }
            } catch {
                toast.error('Không thể chuyển đổi link');
            } finally {
                setConverting(false);
            }
        }

        // TikTok / Instagram: strip query params for clean link
        if (isTikTokUrl(value) || isInstagramUrl(value)) {
            const cleaned = cleanSocialUrl(value);
            if (cleaned !== value) {
                setFormData(prev => ({ ...prev, object_id: cleaned }));
                toast.success('✅ Đã rút gọn link');
            }
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!service) return;

        // Auth guard
        if (!isAuthenticated) {
            toast.error('Vui lòng đăng nhập để sử dụng dịch vụ');
            navigate('/login', { state: { from: location } });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const body: BuyRequest = {
                object_id: formData.object_id || '',
                package_name: selectedPackage,
                display_name: currentPkg?.name || selectedPackage,
            };

            // Add optional fields
            if (formData.quantity) body.quantity = parseInt(formData.quantity);
            if (formData.object_type) body.object_type = formData.object_type;
            if (formData.list_message) body.list_message = formData.list_message;
            if (formData.num_minutes) body.num_minutes = parseInt(formData.num_minutes);
            if (formData.num_day) body.num_day = parseInt(formData.num_day);
            if (formData.slbv) body.slbv = formData.slbv;
            if (formData.fb_name) body.fb_name = formData.fb_name;

            const res = await buyService(service.endpoint, body, service.id);

            if (res.success) {
                setResult({
                    success: true,
                    message: res.message || 'Tạo đơn thành công!',
                    orderId: res.data?.id,
                });
                toast.success(`✅ ${res.message || 'Tạo đơn thành công!'}`);
            } else {
                setResult({
                    success: false,
                    message: res.message || 'Có lỗi xảy ra',
                });
                toast.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Không thể kết nối đến server';
            setResult({ success: false, message: msg });
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const currentPkg = packages.find(p => p.package_name === selectedPackage);
    const isAdmin = user?.role === 'admin';

    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="service-page fade-in">
            <div className="service-layout">

                {/* Order Form */}
                <form className="order-form" onSubmit={handleSubmit}>
                    {/* Tab Bar */}
                    <div className="service-tabs">
                        <button
                            type="button"
                            className={`service-tab ${activeTab === 'packages' ? 'active' : ''}`}
                            onClick={() => setActiveTab('packages')}
                        >
                            <PackageIcon size={15} /> Chọn gói dịch vụ
                        </button>
                        {isAuthenticated && (
                            <button
                                type="button"
                                className={`service-tab ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')}
                            >
                                <ClipboardList size={15} /> Lịch sử đơn
                                {serviceOrders.length > 0 && (
                                    <span className="tab-badge">{serviceOrders.length}</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Package Selector */}
                    {activeTab === 'packages' && (
                        <div className="package-selector">
                            {loadingPackages ? (
                                <SkeletonPackageList count={6} />
                            ) : packages.length > 0 ? (
                                <div className="package-list">
                                    {packages.map(pkg => (
                                        <button
                                            type="button"
                                            key={pkg.id}
                                            className={`package-item ${selectedPackage === pkg.package_name ? 'selected' : ''}`}
                                            onClick={() => setSelectedPackage(pkg.package_name)}
                                        >
                                            <span className="package-item-name">{pkg.name}</span>
                                            {pkg.price_per > 0 && (
                                                <span className="package-item-price">
                                                    {isAdmin
                                                        ? `${(pkg as any).original_price?.toLocaleString() || pkg.price_per.toLocaleString()}đ/1`
                                                        : `${pkg.price_per.toLocaleString()}đ/1`
                                                    }
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                                    Chưa có gói dịch vụ. Vui lòng kiểm tra API key.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Order History Tab */}
                    {activeTab === 'history' && (
                        <div className="order-history-panel">
                            {loadingOrders ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div className="spinner" style={{ margin: '0 auto 8px' }} />
                                    Đang tải lịch sử...
                                </div>
                            ) : serviceOrders.length > 0 ? (
                                <div className="order-history-table-wrap">
                                    <table className="order-history-table">
                                        <thead>
                                            <tr>
                                                <th>Mã đơn</th>
                                                <th>Gói</th>
                                                <th>UID</th>
                                                <th>SL</th>
                                                <th>Giá</th>
                                                <th>Trạng thái</th>
                                                <th>Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {serviceOrders.map(o => (
                                                <tr key={o.id}>
                                                    <td className="td-bold">#{o.baostar_order_id || o.id}</td>
                                                    <td>{o.display_name || o.package_name}</td>
                                                    <td>
                                                        <PlatformLink serviceId={o.service_id} objectId={o.object_id} maxLen={30} />
                                                    </td>
                                                    <td>{o.quantity}</td>
                                                    <td className="td-balance">{o.sell_price?.toLocaleString()}đ</td>
                                                    <td>
                                                        <span className={`order-status-badge status-${o.status}`}>
                                                            {o.status === 'processing' ? 'Đang chạy' :
                                                                o.status === 'completed' ? 'Hoàn thành' :
                                                                    o.status === 'failed' ? 'Thất bại' : o.status}
                                                        </span>
                                                    </td>
                                                    <td className="td-date">{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <ClipboardList size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                                    <div>Chưa có đơn hàng nào cho dịch vụ này</div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'packages' && (<>
                        {/* Dynamic Fields */}
                        <div className={`form-fields-grid ${service.id === 'vip' && /clone|^s\d/i.test(currentPkg?.name || '') ? 'vip-clone-fields' : service.id === 'instagram-vip-like' ? 'ig-vip-fields' : ''}`}>
                            {service.fields.map(field => {
                                // Only show reaction selector if selected package supports it
                                if (field.type === 'reaction') {
                                    const selectedPkg = packages.find(p => p.package_name === selectedPackage);
                                    if (!selectedPkg?.config?.reaction) return null;
                                }

                                // Only show fb_name/quantity/slbv for S1/S3 (clone) packages in VIP
                                if (service.id === 'vip' && (field.key === 'fb_name' || field.key === 'quantity' || field.key === 'slbv')) {
                                    const selectedPkg = packages.find(p => p.package_name === selectedPackage);
                                    const isClone = /clone|^s\d/i.test(selectedPkg?.name || '');
                                    if (!isClone) return null;
                                }

                                return (
                                    <div className={`form-group field-${field.key}`} key={field.key}>
                                        <label className="form-label">{field.label}</label>
                                        {field.type === 'reaction' ? (() => {
                                            const selectedPkg = packages.find(p => p.package_name === selectedPackage);
                                            const isMulti = selectedPkg?.config?.multiple_reaction === true;
                                            const currentValues = (formData[field.key] || '').split(',').filter(Boolean);

                                            const handleReactionClick = (val: string) => {
                                                if (isMulti) {
                                                    const newValues = currentValues.includes(val)
                                                        ? currentValues.filter(v => v !== val)
                                                        : [...currentValues, val];
                                                    setFormData(prev => ({ ...prev, [field.key]: newValues.join(',') }));
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        [field.key]: prev[field.key] === val ? '' : val,
                                                    }));
                                                }
                                            };

                                            return (
                                                <div className="reaction-selector">
                                                    {[
                                                        { value: 'like', emoji: '👍', label: 'Like' },
                                                        { value: 'love', emoji: '❤️', label: 'Love' },
                                                        { value: 'haha', emoji: '😆', label: 'Haha' },
                                                        { value: 'wow', emoji: '😮', label: 'Wow' },
                                                        { value: 'care', emoji: '🥰', label: 'Care' },
                                                        { value: 'sad', emoji: '😢', label: 'Sad' },
                                                        { value: 'angry', emoji: '😡', label: 'Angry' },
                                                    ].map(reaction => (
                                                        <button
                                                            type="button"
                                                            key={reaction.value}
                                                            className={`reaction-btn ${isMulti
                                                                ? currentValues.includes(reaction.value) ? 'active' : ''
                                                                : formData[field.key] === reaction.value ? 'active' : ''
                                                                }`}
                                                            onClick={() => handleReactionClick(reaction.value)}
                                                            title={reaction.label}
                                                        >
                                                            <span className="reaction-emoji">{reaction.emoji}</span>
                                                            <span className="reaction-label">{reaction.label}</span>
                                                        </button>
                                                    ))}
                                                    {isMulti && <div className="reaction-hint">Có thể chọn nhiều cảm xúc</div>}
                                                </div>
                                            );
                                        })() : field.type === 'textarea' ? (
                                            <textarea
                                                className="form-input"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                value={formData[field.key] || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                className="form-input"
                                                value={formData[field.key] || (
                                                    field.key === 'num_day' ? '30' :
                                                        field.key === 'quantity' ? '50' :
                                                            field.key === 'slbv' ? '5' : ''
                                                )}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            >
                                                {field.key === 'num_day' && (
                                                    <>
                                                        <option value="7">7 Ngày</option>
                                                        <option value="15">15 Ngày</option>
                                                        <option value="30">30 Ngày</option>
                                                        <option value="60">60 Ngày</option>
                                                        <option value="90">90 Ngày</option>
                                                    </>
                                                )}
                                                {field.key === 'quantity' && (
                                                    <>
                                                        {[50, 100, 150, 200, 250, 300, 500, 700, 750, 1000, 1500, 2000, 3000, 5000, 75000, 100000].map(v => (
                                                            <option key={v} value={String(v)}>{v.toLocaleString()}</option>
                                                        ))}
                                                    </>
                                                )}
                                                {field.key === 'slbv' && (
                                                    <>
                                                        {Array.from({ length: 20 }, (_, i) => {
                                                            const val = (i + 1) * 5;
                                                            return <option key={val} value={String(val)}>{val} (giá x{i + 1})</option>;
                                                        })}
                                                    </>
                                                )}
                                            </select>
                                        ) : field.key === 'object_id' ? (
                                            <div className="convert-uid-input">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder={field.placeholder || (serviceId?.startsWith('tiktok') ? 'Nhập link TikTok' : serviceId?.startsWith('instagram') ? 'Nhập link Instagram' : 'Nhập link Facebook hoặc ID bài viết')}
                                                    required={field.required}
                                                    value={formData[field.key] || ''}
                                                    onChange={e => handleObjectIdChange(e.target.value)}
                                                />
                                                {converting && <Loader2 size={18} className="spin convert-spinner" />}
                                            </div>
                                        ) : (
                                            <input
                                                type={field.type}
                                                className="form-input"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                min={field.min}
                                                value={formData[field.key] || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ghi chú */}
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <textarea
                                className="form-input"
                                placeholder="Ghi chú (không bắt buộc)"
                                rows={2}
                                style={{ minHeight: 'auto' }}
                                value={formData.notes || ''}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>

                        {/* Price Summary */}
                        {(() => {
                            const selectedPkg = packages.find(p => p.package_name === selectedPackage);
                            const displayPrice = isAdmin
                                ? ((selectedPkg as any)?.original_price || selectedPkg?.price_per || 0)
                                : (selectedPkg?.price_per || 0);
                            const isVipService = ['vip', 'instagram-vip-like'].includes(service?.id || '');

                            if (isVipService && selectedPkg && displayPrice > 0) {
                                const numDay = parseInt(formData.num_day) || 30;

                                let total: number;
                                let detail: string;

                                if (service?.id === 'vip') {
                                    const isClone = /clone|^s\d/i.test(selectedPkg.name);
                                    if (isClone) {
                                        const qty = parseInt(formData.quantity) || 50;
                                        const slbv = parseInt(formData.slbv) || 5;
                                        const multiplier = slbv / 5;
                                        total = displayPrice * qty * numDay * multiplier;
                                        detail = `${qty.toLocaleString()} like × ${numDay} ngày × ${multiplier}x = ${total.toLocaleString()} vnđ (giá ${displayPrice.toLocaleString()} vnđ/like)`;
                                    } else {
                                        total = displayPrice * numDay;
                                        detail = `Bạn sẽ tăng 1 tương tác với giá ${displayPrice.toLocaleString()} vnđ / tương tác`;
                                    }
                                } else {
                                    // Instagram VIP Like: price × qty × days
                                    const qty = parseInt(formData.quantity) || 50;
                                    total = displayPrice * qty * numDay;
                                    detail = `${qty.toLocaleString()} like × ${numDay} ngày = ${total.toLocaleString()} vnđ (giá ${displayPrice.toLocaleString()} vnđ/like)`;
                                }

                                return (
                                    <div className="price-summary">
                                        <div className="price-total">{total.toLocaleString()} vnđ</div>
                                        <div className="price-label">
                                            {isAdmin ? 'Giá gốc BaoStar (Admin miễn phí)' : 'Tổng tiền thanh toán'}
                                        </div>
                                        <div className="price-detail">{detail}</div>
                                    </div>
                                );
                            } else if (!isVipService) {
                                const qty = parseInt(formData.quantity) || 0;
                                const total = qty * displayPrice;

                                if (selectedPkg && qty > 0 && displayPrice > 0) {
                                    return (
                                        <div className="price-summary">
                                            <div className="price-total">{total.toLocaleString()} vnđ</div>
                                            <div className="price-label">
                                                {isAdmin ? 'Giá gốc BaoStar (Admin miễn phí)' : 'Tổng tiền thanh toán'}
                                            </div>
                                            <div className="price-detail">
                                                Bạn sẽ tăng {qty.toLocaleString()} tương tác với giá {displayPrice.toLocaleString()} vnđ / tương tác
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-full"
                            disabled={loading || !selectedPackage}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Mua dịch vụ
                                </>
                            )}
                        </button>

                        {/* Result */}
                        {result && (
                            <div
                                style={{
                                    marginTop: 20,
                                    padding: 20,
                                    borderRadius: 'var(--radius-md)',
                                    background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                {result.success ? (
                                    <CheckCircle size={22} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                                ) : (
                                    <AlertCircle size={22} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
                                )}
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{result.message}</div>
                                    {result.orderId && (
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            Mã đơn: #{result.orderId}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>)}
                </form>

                {/* Right Sidebar */}
                <aside className="service-sidebar">
                    {/* Account Info */}
                    {isAuthenticated && user && (
                        <div className="sidebar-card sidebar-account">
                            <div className="sidebar-card-header">
                                <User size={16} /> Thông tin tài khoản
                            </div>
                            <div className="sidebar-card-body">
                                <div className="sidebar-avatar-row">
                                    <div className="sidebar-avatar" style={{ background: getAvatarColor(user.username) }}>
                                        {getInitials(user.display_name || user.username)}
                                    </div>
                                    <div>
                                        <div className="sidebar-username">{user.display_name || user.username}</div>
                                        <div className="sidebar-role">{user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</div>
                                    </div>
                                </div>
                                <div className="sidebar-balance-row">
                                    <Wallet size={16} />
                                    <span>Số dư:</span>
                                    <strong>{user.balance.toLocaleString()}đ</strong>
                                </div>
                                <div className="sidebar-balance-row">
                                    <CreditCard size={16} />
                                    <span>Tổng nạp:</span>
                                    <strong>{totalDeposit.toLocaleString()}đ</strong>
                                </div>
                                <div className="sidebar-actions">
                                    <button className="sidebar-action-btn" onClick={() => navigate('/deposit')}>
                                        <Wallet size={14} /> Nạp tiền
                                    </button>
                                    <button className="sidebar-action-btn" onClick={() => navigate('/orders')}>
                                        <ClipboardList size={14} /> Đơn hàng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Package Notes */}
                    {currentPkg?.notes && (
                        <div className="sidebar-card sidebar-notes">
                            <div className="sidebar-card-header">
                                <Info size={16} /> Ghi chú gói dịch vụ
                            </div>
                            <div className="sidebar-card-body">
                                <p className="sidebar-pkg-name">{currentPkg.name}</p>
                                <div className="sidebar-pkg-note" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentPkg.notes) }} />
                                {currentPkg.min != null && currentPkg.max != null && (
                                    <div className="sidebar-pkg-range">
                                        Min: <strong>{currentPkg.min.toLocaleString()}</strong> — Max: <strong>{currentPkg.max.toLocaleString()}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Package Summary — always show when a package is selected */}
                    {currentPkg && !currentPkg.notes && (
                        <div className="sidebar-card">
                            <div className="sidebar-card-header">
                                <PackageIcon size={16} /> Thông tin gói
                            </div>
                            <div className="sidebar-card-body">
                                <p className="sidebar-pkg-name">{currentPkg.name}</p>
                                {currentPkg.price_per > 0 && (
                                    <div className="sidebar-balance-row">
                                        <DollarSign size={16} />
                                        <span>Giá:</span>
                                        <strong>{currentPkg.price_per.toLocaleString()}đ/1</strong>
                                    </div>
                                )}
                                {currentPkg.min != null && currentPkg.max != null && (
                                    <div className="sidebar-pkg-range">
                                        Min: <strong>{currentPkg.min.toLocaleString()}</strong> — Max: <strong>{currentPkg.max.toLocaleString()}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </aside>
            </div>
        </div>
    );
}
