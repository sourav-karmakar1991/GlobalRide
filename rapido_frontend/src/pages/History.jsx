import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rideService } from '../services/rideService';

export default function History() {
    const [rides, setRides] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        rideService.getHistory().then(setRides).catch((err) => setError(err?.response?.data?.detail || 'Unable to load trip history'));
    }, []);

    return <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <p><Link to={localStorage.getItem('userRole') === 'driver' ? '/driver' : '/rider'}>Back to dashboard</Link></p>
            <h1>Past trips</h1>
            {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
            {!error && rides.length === 0 && <p>No completed trips yet.</p>}
            {rides.map((ride) => <article key={ride.ride_id} style={{ background: '#fff', padding: 18, borderRadius: 10, marginBottom: 12, boxShadow: '0 6px 18px rgba(15,23,42,.08)' }}>
                <strong>{ride.pickup} to {ride.drop}</strong>
                <p>Ride #{ride.ride_id} | {ride.ride_type} | Fare: INR {ride.fare}</p>
                <p>{ride.captain_name || 'Driver'} | {ride.payment_status}</p>
            </article>)}
        </div>
    </main>;
}