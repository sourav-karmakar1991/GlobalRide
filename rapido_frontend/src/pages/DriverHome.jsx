import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rideService } from '../services/rideService';
import { BASE_URL } from '../services/api';

export default function DriverHome() {
    const [availableRides, setAvailableRides] = useState([]);
    const [otpInputs, setOtpInputs] = useState({});
    const navigate = useNavigate();

    const fetchRides = async () => {
        try {
            const rides = await rideService.getAvailableRides();
            setAvailableRides(rides || []);
        } catch (err) {
            console.error('Error fetching rides:', err);
        }
    };

    useEffect(() => {
        const initialFetch = setTimeout(fetchRides, 0);
        const interval = setInterval(fetchRides, 3000);
        return () => { clearTimeout(initialFetch); clearInterval(interval); };
    }, []);

    useEffect(() => {
        const sockets = availableRides.filter((ride) => ['Accepted', 'Ongoing'].includes(ride.status)).map((ride) => {
            const socket = new WebSocket(`${BASE_URL.replace(/^http/, 'ws')}/ws/ride/${ride.ride_id}`);
            let watcher;
            socket.onopen = () => {
                if (navigator.geolocation) {
                    watcher = navigator.geolocation.watchPosition((position) => {
                        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }));
                    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
                }
            };
            return { socket, get watcher() { return watcher; } };
        });
        return () => sockets.forEach(({ socket, watcher }) => { if (watcher) navigator.geolocation.clearWatch(watcher); socket.close(); });
    }, [availableRides]);

    const handleAcceptRide = async (rideId) => {
        const role = (localStorage.getItem('userRole') || '').toLowerCase();
        const token = localStorage.getItem('token');
        if (!token || (role && !['driver', 'captain'].includes(role))) {
            alert('Please log in with a registered driver account before accepting rides.');
            navigate('/');
            return;
        }
        try {
            const data = await rideService.acceptRide(rideId);
            alert(`Ride accepted. Share OTP ${data.otp} with the rider.`);
            fetchRides();
        } catch (err) {
            console.error(err);
            const message = err?.response?.data?.detail || err.message || 'Error accepting ride';
            alert(message);
        }
    };

    const handleStartRide = async (rideId) => {
        const enteredOtp = otpInputs[rideId];
        if (!enteredOtp) {
            alert('Please enter the OTP provided by the rider to start the trip.');
            return;
        }

        try {
            const data = await rideService.startRide(rideId, enteredOtp);
            alert(`Ride started: ${data.status}`);
            fetchRides();
        } catch (err) {
            console.error(err);
            const message = err?.response?.data?.detail || err.message || 'Error starting ride';
            alert(message);
        }
    };

    const handleCompleteRide = async (rideId) => {
        try {
            const data = await rideService.completeRide(rideId);
            alert(`Ride completed: ${data.status}`);
            fetchRides();
        } catch (err) {
            console.error(err);
            const message = err?.response?.data?.detail || err.message || 'Error completing ride';
            alert(message);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Captain dashboard</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b' }}>Accept incoming ride requests and complete them safely.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Link to="/history">History</Link><button onClick={fetchRides} style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Refresh rides</button></div>
                </div>
                {availableRides.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}>No active rides available right now.</div>
                ) : (
                    availableRides.map((ride) => (
                        <div key={ride.ride_id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}>
                            <p><strong>Ride ID:</strong> {ride.ride_id}</p>
                            <p><strong>Route:</strong> {ride.pickup} → {ride.drop}</p>
                            <p><strong>Status:</strong> <span style={{ color: ride.status === 'Accepted' ? '#16a34a' : '#f59e0b' }}>{ride.status}</span></p>
                            <p><strong>Fare:</strong> ₹{ride.fare}</p>
                               <p><strong>Client:</strong> {ride.client_name || '—'}</p>
                               <p><strong>Client phone:</strong> {ride.client_phone ? (<a href={`tel:${ride.client_phone}`} style={{ color: '#2563eb' }}>{ride.client_phone}</a>) : '—'}</p>
                            {ride.status === 'Requested' && (
                                <button onClick={() => handleAcceptRide(ride.ride_id)} style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Accept ride</button>
                            )}
                                {ride.status === 'Accepted' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <input value={otpInputs[ride.ride_id] || ''} onChange={(e) => setOtpInputs({ ...otpInputs, [ride.ride_id]: e.target.value })} placeholder="Enter OTP from rider" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginRight: '10px' }} />
                                        <button onClick={() => handleStartRide(ride.ride_id)} style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Start ride</button>
                                    </div>
                            )}
                            {ride.status === 'Ongoing' && (
                                <div style={{ marginTop: '12px' }}>
                                    <button onClick={() => handleCompleteRide(ride.ride_id)} style={{ padding: '10px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Complete ride</button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}