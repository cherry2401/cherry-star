import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Copy, CheckCircle, History, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Transaction {
    id: number;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
}

export default function DepositPage() {
    const { user, refreshUser } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTxns, setLoadingTxns] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'transfer' | 'history'>('transfer');

    // Mã giao dịch (giữ nguyên trong session, đổi khi F5)
    const txCode = useMemo(() => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TX${code}`;
    }, []);

    const banks = [
        {
            bank: 'Techcombank',
            bankCode: 'TCB',
            name: 'NGUYEN TRAN LINH VU',
            number: '6668888648',
            branch: 'Techcombank',
        },
        {
            bank: 'Vietcombank',
            bankCode: 'VCB',
            name: 'NGUYEN TRAN LINH VU',
            number: '0041000286523',
            branch: 'PGD Hải Châu',
        },
    ];

    // Stable transfer content based on username (no random code that server can't verify)
    const transferContent = `${user?.username || ''} chuyen tien ${txCode}`;

    const copyToClipboard = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        toast.success('Đã copy!');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const loadTransactions = useCallback(async () => {
        setLoadingTxns(true);
        try {
            const { data } = await api.get('/api/user/transactions');
            if (data.success) setTransactions(data.data);
        } catch {
            toast.error('Không thể tải lịch sử');
        } finally {
            setLoadingTxns(false);
        }
    }, []);

    // Run once on mount only — refreshUser is not memoized so must NOT be in deps
    useEffect(() => {
        loadTransactions();
        refreshUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload transactions when switching to history tab
    const handleTabChange = (tab: 'transfer' | 'history') => {
        setActiveTab(tab);
        if (tab === 'history') {
            loadTransactions();
        }
    };

    return (
        <div className="deposit-page fade-in">
            {/* Balance card */}
            <div className="balance-card">
                <div className="balance-card-icon">
                    <Wallet size={24} />
                </div>
                <div className="balance-card-info">
                    <span className="balance-label">Số dư hiện tại</span>
                    <span className="balance-amount">{(user?.balance || 0).toLocaleString()}đ</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="deposit-tabs">
                <button
                    className={`deposit-tab ${activeTab === 'transfer' ? 'active' : ''}`}
                    onClick={() => handleTabChange('transfer')}
                >
                    <Landmark size={18} />
                    Chuyển khoản ngân hàng
                </button>
                <button
                    className={`deposit-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => handleTabChange('history')}
                >
                    <History size={18} />
                    Lịch sử giao dịch
                </button>
            </div>

            {/* Content */}
            {activeTab === 'transfer' ? (
                <div className="fade-in">
                    {/* Transfer content info */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                📝 Nội dung CK: <strong style={{ color: 'var(--accent-blue)' }}>{transferContent}</strong>
                            </span>
                            <button className="copy-btn" onClick={() => copyToClipboard(transferContent, 'content')}>
                                {copiedField === 'content' ? <CheckCircle size={14} /> : <Copy size={14} />} Copy
                            </button>
                        </div>
                    </div>

                    {/* Two banks side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                        {banks.map((b) => (
                            <div key={b.bankCode} className="deposit-bank-card" style={{ marginBottom: 0 }}>
                                <h3 style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Landmark size={18} /> {b.bank}
                                </h3>

                                <div className="bank-info-table">
                                    <div className="bank-row">
                                        <span className="bank-label">Chủ TK</span>
                                        <span className="bank-value highlight">{b.name}</span>
                                    </div>
                                    <div className="bank-row">
                                        <span className="bank-label">Số TK</span>
                                        <span className="bank-value">
                                            <span className="highlight">{b.number}</span>
                                            <button className="copy-btn" onClick={() => copyToClipboard(b.number, `stk-${b.bankCode}`)}>
                                                {copiedField === `stk-${b.bankCode}` ? <CheckCircle size={14} /> : <Copy size={14} />} Copy
                                            </button>
                                        </span>
                                    </div>
                                    <div className="bank-row">
                                        <span className="bank-label">Chi nhánh</span>
                                        <span className="bank-value">{b.branch}</span>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div style={{ textAlign: 'center', marginTop: 16, padding: '20px 0 12px', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ background: '#fff', display: 'inline-block', padding: 8, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                        <img
                                            src={`https://img.vietqr.io/image/${b.bankCode}-${b.number}-compact.png?amount=0&addInfo=${encodeURIComponent(transferContent)}`}
                                            alt={`QR ${b.bank}`}
                                            style={{ width: 280, maxWidth: '100%', borderRadius: 8, display: 'block' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Quét bằng app ngân hàng bất kỳ</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bank-note" style={{ marginTop: 16 }}>
                        ⚠️ Vui lòng ghi đúng nội dung chuyển khoản để được cộng tiền tự động.
                        Thời gian xử lý: <strong>5-30 phút</strong> trong giờ hành chính.
                    </div>
                </div>
            ) : (
                /* Transaction history */
                <div className="transaction-history fade-in">
                    <h3>Lịch sử giao dịch</h3>
                    {loadingTxns ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="empty-text">Chưa có giao dịch nào</p>
                    ) : (
                        <div className="txn-list">
                            {transactions.map(txn => (
                                <div key={txn.id} className={`txn-item txn-${txn.type}`}>
                                    <div className="txn-info">
                                        <span className="txn-desc">{txn.description}</span>
                                        <span className="txn-date">{new Date(txn.created_at).toLocaleString('vi-VN')}</span>
                                    </div>
                                    <div className="txn-amount-col">
                                        <span className={`txn-amount ${txn.amount > 0 ? 'positive' : 'negative'}`}>
                                            {txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()}đ
                                        </span>
                                        <span className="txn-balance">Còn: {txn.balance_after.toLocaleString()}đ</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
