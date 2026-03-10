import '../styles/skeleton.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    borderRadius?: string;
    className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton-pulse ${className}`}
            style={{ width, height, borderRadius }}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <Skeleton width="40px" height="40px" borderRadius="12px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width="60%" height="20px" />
                <Skeleton width="40%" height="14px" />
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="skeleton-table">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="skeleton-table-row">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} width={c === 0 ? '30%' : '20%'} height="14px" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonPackageList({ count = 5 }: { count?: number }) {
    return (
        <div className="skeleton-package-list">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="skeleton-package-item">
                    <Skeleton width="55%" height="16px" />
                    <Skeleton width="60px" height="16px" />
                </div>
            ))}
        </div>
    );
}
