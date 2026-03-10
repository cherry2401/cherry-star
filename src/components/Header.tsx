import { useState, useRef, useEffect } from 'react';
import { Menu, Wallet, LogIn, UserPlus, User, CreditCard, History, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    title: string;
    subtitle?: string;
    onMenuToggle: () => void;
}

export default function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
    const { user, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setDropdownOpen(false);
        navigate('/login');
    };

    // Generate avatar initials from display name or username
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Generate consistent color from username
    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <header className="header">
            <div className="header-left">
                <button className="menu-toggle" onClick={onMenuToggle}>
                    <Menu size={20} />
                </button>
                <div>
                    <h2 className="header-title">{title}</h2>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="header-right">
                <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                {isAuthenticated && user ? (
                    <div className="header-user-area" ref={dropdownRef}>
                        <button
                            className="header-avatar-btn"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <div
                                className="header-avatar"
                                style={{ background: getAvatarColor(user.username) }}
                            >
                                {getInitials(user.display_name || user.username)}
                            </div>
                            <ChevronDown size={14} className={`avatar-chevron ${dropdownOpen ? 'open' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="header-dropdown">
                                <div className="dropdown-greeting">
                                    Chào mừng <strong>{user.display_name || user.username}</strong>
                                </div>
                                <div className="dropdown-balance">
                                    <Wallet size={16} />
                                    Số tiền: <strong>{user.balance.toLocaleString()}đ</strong>
                                </div>
                                <div className="dropdown-divider" />
                                <Link to="/account" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <User size={16} /> Tài khoản
                                </Link>
                                <Link to="/deposit" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <CreditCard size={16} /> Nạp tiền
                                </Link>
                                <Link to="/order-history" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <History size={16} /> Lịch sử đơn hàng
                                </Link>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                                    <LogOut size={16} /> Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="header-auth-buttons">
                        <Link to="/login" className="header-login-btn">
                            <LogIn size={16} />
                            Đăng nhập
                        </Link>
                        <Link to="/register" className="header-register-btn">
                            <UserPlus size={16} />
                            Đăng ký
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}
