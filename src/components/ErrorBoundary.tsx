import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-card">
                        <div className="error-boundary-icon">
                            <AlertTriangle size={48} />
                        </div>
                        <h2>Oops! Đã xảy ra lỗi</h2>
                        <p className="error-boundary-desc">
                            Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="error-boundary-detail">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="error-boundary-actions">
                            <button className="btn-primary" onClick={this.handleReload}>
                                <RefreshCw size={16} /> Tải lại trang
                            </button>
                            <button className="btn-secondary" onClick={this.handleGoHome}>
                                <Home size={16} /> Về trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
