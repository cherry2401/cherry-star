import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServicePage from './pages/ServicePage';
import OrderHistory from './pages/OrderHistory';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DepositPage from './pages/DepositPage';
import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a2035',
                  color: '#f1f5f9',
                  border: '1px solid #1e2a45',
                  borderRadius: '12px',
                  boxShadow: '0 20px 50px -12px rgba(0,0,0,0.6)',
                  fontSize: '14px',
                },
              }}
            />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="facebook/:serviceId" element={<ServicePage />} />
                <Route path="tiktok/:serviceId" element={<ServicePage />} />
                <Route path="instagram/:serviceId" element={<ServicePage />} />
                <Route path="order-history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="deposit" element={<ProtectedRoute><DepositPage /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
                <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

