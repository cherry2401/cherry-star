import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
    id: number;
    username: string;
    email: string | null;
    phone: string | null;
    display_name: string;
    balance: number;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

interface RegisterData {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    display_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Fetch user on mount if token exists
    useEffect(() => {
        if (token) {
            refreshUser().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const refreshUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.success) {
                setUser(data.data);
            }
        } catch {
            // Token invalid → logout
            logout();
        }
    };

    const login = async (identifier: string, password: string) => {
        const { data } = await api.post('/auth/login', { identifier, password });
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            setToken(data.data.token);
            setUser(data.data.user);
        } else {
            throw new Error(data.message);
        }
    };

    const register = async (regData: RegisterData) => {
        const { data } = await api.post('/auth/register', regData);
        if (data.success) {
            localStorage.setItem('token', data.data.token);
            setToken(data.data.token);
            setUser(data.data.user);
        } else {
            throw new Error(data.message);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'admin',
            loading,
            login,
            register,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

