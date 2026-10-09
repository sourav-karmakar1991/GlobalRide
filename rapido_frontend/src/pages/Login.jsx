import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/authService';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await loginUser({ username, password });
            localStorage.setItem('token', data.access_token);
            const role = String(data.role || 'rider').toLowerCase();
            localStorage.setItem('userRole', role);
            localStorage.setItem('userId', String(data.user_id));
            localStorage.setItem('userName', data.full_name || username);
            const nextPath = role === 'admin' ? '/admin' : (role === 'driver' || role === 'captain' ? '/driver' : '/rider');
            navigate(nextPath);
        } catch (err) {
            const message = err?.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', color: '#fff', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(15, 23, 42, 0.92)', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 45px rgba(0,0,0,0.25)' }}>
                <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Welcome back</h2>
                <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '20px' }}>Sign in to continue your ride</p>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>{loading ? 'Logging in...' : 'Login'}</button>
                </form>
                <p style={{ marginTop: '12px', marginBottom: 0, textAlign: 'center', color: '#facc15', fontSize: '13px' }}>
                    Rider demo: rider@eziride.com / rider123<br />
                    Admin demo: admin@eziride.com / admin123
                </p>
                <p style={{ marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    New here? <Link to="/register" style={{ color: '#60a5fa' }}>Create an account</Link>
                </p>
            </div>
        </div>
    );
}
