import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export default function GoogleSignInButton({ text = 'continue_with' }: GoogleSignInButtonProps) {
    const { setAuthData } = useAuth();
    const navigate = useNavigate();
    const buttonRef = useRef<HTMLDivElement>(null);

    const handleCredentialResponse = useCallback(async (response: any) => {
        try {
            const { data } = await api.post('/auth/google', { credential: response.credential });
            if (data.success) {
                setAuthData(data.data.token, data.data.user);
                toast.success('🎉 Đăng nhập thành công!');
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Đăng nhập Google thất bại');
        }
    }, [setAuthData, navigate]);

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || !window.google || !buttonRef.current) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            width: buttonRef.current.offsetWidth,
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
        });
    }, [handleCredentialResponse, text]);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return null;

    return (
        <div className="google-signin-wrap">
            <div className="auth-divider">
                <span>hoặc</span>
            </div>
            <div ref={buttonRef} className="google-btn-container" />
        </div>
    );
}
