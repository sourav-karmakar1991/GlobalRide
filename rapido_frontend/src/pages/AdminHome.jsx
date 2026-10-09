import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'rapido_admin_snapshot';

const defaultSnapshot = {
    drivers: [
        { id: 1, name: 'Amit Verma', phone: '9876543210', vehicle: 'DL01AB1234', status: 'online' },
        { id: 2, name: 'Rohit Singh', phone: '9123456780', vehicle: 'DL02CD4321', status: 'busy' },
        { id: 3, name: 'Sonia Mehra', phone: '9988776655', vehicle: 'DL03EF5678', status: 'offline' },
    ],
    riders: [
        { id: 1, name: 'Neha Sharma', phone: '9988776601', trips: 12 },
        { id: 2, name: 'Karan Gupta', phone: '9988776602', trips: 8 },
        { id: 3, name: 'Priya Nair', phone: '9988776603', trips: 15 },
    ],
    rides: [
        { id: 101, rider: 'Neha Sharma', pickup: 'Connaught Place', drop: 'India Gate', fare: 245, status: 'Requested', driver: 'Amit Verma', createdAt: '09 Oct, 10:10 AM' },
        { id: 102, rider: 'Karan Gupta', pickup: 'Saket', drop: 'Dwarka', fare: 410, status: 'Accepted', driver: 'Rohit Singh', createdAt: '09 Oct, 10:25 AM' },
        { id: 103, rider: 'Priya Nair', pickup: 'Noida Sector 62', drop: 'Greater Kailash', fare: 360, status: 'Ongoing', driver: 'Amit Verma', createdAt: '09 Oct, 10:40 AM' },
        { id: 104, rider: 'Neha Sharma', pickup: 'Rajouri Garden', drop: 'Lajpat Nagar', fare: 290, status: 'Completed', driver: 'Sonia Mehra', createdAt: '09 Oct, 09:50 AM' },
    ],
};

const readSnapshot = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSnapshot));
            return structuredClone(defaultSnapshot);
        }
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === 'object' ? parsed : structuredClone(defaultSnapshot);
    } catch (error) {
        return structuredClone(defaultSnapshot);
    }
};

export default function AdminHome() {
    const navigate = useNavigate();
    const [snapshot, setSnapshot] = useState(readSnapshot);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const role = (localStorage.getItem('userRole') || '').toLowerCase();
        if (role !== 'admin') {
            alert('Admin access required. Please log in with the admin account.');
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }, [snapshot]);

    const stats = useMemo(() => {
        const activeCount = snapshot.rides.filter((ride) => ['Accepted', 'Ongoing'].includes(ride.status)).length;
        const onlineDrivers = snapshot.drivers.filter((driver) => driver.status === 'online').length;
        const revenue = snapshot.rides.reduce((sum, ride) => sum + (ride.status === 'Completed' ? Number(ride.fare || 0) : 0), 0);
        return {
            totalRides: snapshot.rides.length,
            activeRides: activeCount,
            totalDrivers: snapshot.drivers.length,
            onlineDrivers,
            totalRevenue: revenue,
        };
    }, [snapshot]);

    const updateSnapshot = (updater) => {
        setSnapshot((current) => {
            const next = typeof updater === 'function' ? updater(current) : updater;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const handleRideStatus = (rideId, nextStatus) => {
        updateSnapshot((current) => ({
            ...current,
            rides: current.rides.map((ride) => (ride.id === rideId ? { ...ride, status: nextStatus } : ride)),
        }));
    };

    const handleAssignDriver = (rideId, driverName) => {
        updateSnapshot((current) => ({
            ...current,
            rides: current.rides.map((ride) => (ride.id === rideId ? { ...ride, driver: driverName } : ride)),
        }));
    };

    const toggleDriverStatus = (driverId) => {
        updateSnapshot((current) => ({
            ...current,
            drivers: current.drivers.map((driver) => {
                if (driver.id !== driverId) return driver;
                return {
                    ...driver,
                    status: driver.status === 'online' ? 'offline' : 'online',
                };
            }),
        }));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        navigate('/');
    };

    const cardStyle = {
        background: '#fff',
        borderRadius: '18px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
    };

    const tabs = ['overview', 'drivers', 'rides', 'riders'];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', padding: '24px', color: '#0f172a' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <p style={{ margin: 0, color: '#c7d2fe', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px' }}>Admin control center</p>
                        <h1 style={{ margin: '6px 0 0', color: '#fff', fontSize: '32px' }}>Global Ride command panel</h1>
                    </div>
                    <button onClick={handleLogout} style={{ padding: '10px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>
                        Logout
                    </button>
                </div>

                <div style={{ background: '#fff', borderRadius: '20px', padding: '18px', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    background: activeTab === tab ? '#2563eb' : '#e2e8f0',
                                    color: activeTab === tab ? '#fff' : '#0f172a',
                                    fontWeight: 700,
                                    textTransform: 'capitalize',
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '24px' }}>
                            <div style={cardStyle}>
                                <p style={{ margin: 0, color: '#64748b' }}>Total rides</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '32px' }}>{stats.totalRides}</h2>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ margin: 0, color: '#64748b' }}>Active rides</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '32px' }}>{stats.activeRides}</h2>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ margin: 0, color: '#64748b' }}>Drivers online</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '32px' }}>{stats.onlineDrivers}/{stats.totalDrivers}</h2>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ margin: 0, color: '#64748b' }}>Revenue</p>
                                <h2 style={{ margin: '8px 0 0', fontSize: '32px' }}>₹{stats.totalRevenue}</h2>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
                            <div style={cardStyle}>
                                <h3 style={{ marginTop: 0 }}>Recent ride activity</h3>
                                {snapshot.rides.slice().reverse().slice(0, 5).map((ride) => (
                                    <div key={ride.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                                        <div>
                                            <strong>{ride.rider}</strong>
                                            <div style={{ color: '#64748b', fontSize: '14px' }}>{ride.pickup} → {ride.drop}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700 }}>{ride.status}</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>₹{ride.fare}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={cardStyle}>
                                <h3 style={{ marginTop: 0 }}>Fleet overview</h3>
                                {snapshot.drivers.map((driver) => (
                                    <div key={driver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                                        <div>
                                            <strong>{driver.name}</strong>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{driver.vehicle}</div>
                                        </div>
                                        <span style={{ background: driver.status === 'online' ? '#dcfce7' : '#fee2e2', color: driver.status === 'online' ? '#166534' : '#991b1b', padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                                            {driver.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'drivers' && (
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>Driver management</h3>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            {snapshot.drivers.map((driver) => (
                                <div key={driver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div>
                                        <strong>{driver.name}</strong>
                                        <div style={{ color: '#64748b', fontSize: '14px' }}>{driver.phone} · {driver.vehicle}</div>
                                    </div>
                                    <button onClick={() => toggleDriverStatus(driver.id)} style={{ padding: '9px 14px', border: 'none', borderRadius: '8px', background: driver.status === 'online' ? '#f97316' : '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                                        {driver.status === 'online' ? 'Go offline' : 'Go online'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'rides' && (
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>Ride control</h3>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            {snapshot.rides.map((ride) => (
                                <div key={ride.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: 800 }}>{ride.rider}</div>
                                            <div style={{ color: '#64748b', fontSize: '14px' }}>{ride.pickup} → {ride.drop}</div>
                                            <div style={{ color: '#64748b', fontSize: '14px' }}>Driver: {ride.driver}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700 }}>{ride.status}</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>₹{ride.fare}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <select
                                            defaultValue={ride.driver}
                                            onChange={(event) => handleAssignDriver(ride.id, event.target.value)}
                                            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        >
                                            {snapshot.drivers.map((driver) => (
                                                <option key={driver.id} value={driver.name}>{driver.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleRideStatus(ride.id, 'Accepted')} style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Accept</button>
                                        <button onClick={() => handleRideStatus(ride.id, 'Ongoing')} style={{ padding: '8px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Start</button>
                                        <button onClick={() => handleRideStatus(ride.id, 'Completed')} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Complete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'riders' && (
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>Rider directory</h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {snapshot.riders.map((rider) => (
                                <div key={rider.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div>
                                        <strong>{rider.name}</strong>
                                        <div style={{ color: '#64748b', fontSize: '14px' }}>{rider.phone}</div>
                                    </div>
                                    <div style={{ fontWeight: 700 }}>Trips: {rider.trips}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
