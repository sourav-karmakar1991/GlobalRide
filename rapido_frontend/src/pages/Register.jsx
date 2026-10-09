import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('rider');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerUser({ full_name: name, email, phone, password, role, vehicle_number: vehicleNumber });
            alert('Registration successful. You can now log in.');
            navigate('/');
        } catch (err) {
            const message = err?.response?.data?.detail || err.message || 'Registration failed. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #111827, #2563eb)', color: '#fff', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '460px', background: 'rgba(17, 24, 39, 0.95)', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 45px rgba(0,0,0,0.25)' }}>
                <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Create your account</h2>
                <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '20px' }}>Join Global Ride and book a ride in minutes</p>
                <form onSubmit={handleRegister}>
                    <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} aria-label="Account type">
                        <option value="rider">Rider</option>
                        <option value="driver">Driver</option>
                        <option value="captain">Captain</option>
                        <option value="admin">Admin</option>
                    </select>
                    {role !== 'rider' && (
                        <input type="text" placeholder="Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    )}
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #334155' }} required />
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>{loading ? 'Registering...' : 'Register'}</button>
                </form>
                <p style={{ marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    Already registered? <Link to="/" style={{ color: '#60a5fa' }}>Login here</Link>
                </p>
            </div>
        </div>
    );
}