import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40,
        }}>
            <h1 style={{ fontSize: 72, fontWeight: 800, color: 'var(--accent-blue)', margin: 0 }}>404</h1>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 8 }}>
                Trang bạn tìm không tồn tại
            </p>
            <Link to="/" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Home size={18} /> Về trang chủ
            </Link>
        </div>
    );
}
