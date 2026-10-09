import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveMap from '../components/LiveMap';
import { rideService } from '../services/rideService';
import { paymentService } from '../services/paymentService';
import { BASE_URL } from '../services/api';

export default function RiderHome() {
    const [form, setForm] = useState({ pickup: 'Connaught Place', drop: 'India Gate', rideType: 'Economy', driverChoice: '', clientName: 'Demo Rider', clientPhone: '9999999999', pickupLat: null, pickupLng: null, dropLat: null, dropLng: null });
    const [ride, setRide] = useState(null);
    const [status, setStatus] = useState('Idle');
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [ratingOpen, setRatingOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [razorpayReady, setRazorpayReady] = useState(false);
    const [estimate, setEstimate] = useState(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [suggestions, setSuggestions] = useState({ pickup: [], drop: [] });
    const estimateTimer = useRef(null);
    const suggestionTimer = useRef(null);

    const bookRide = async (e) => {
        e.preventDefault();
        setLoading(true);
        setPaymentMessage('');
        try {
            const data = await rideService.bookRide(form);
            setRide(data);
            setStatus(data.status || 'Requested');
        } catch (err) {
            const message = err?.response?.data?.detail || err.message || 'Booking failed';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!ride?.ride_id) {
            return;
        }
        const currentUserId = Number(localStorage.getItem('userId'));
        if (Number.isInteger(currentUserId) && currentUserId !== ride.user_id) {
            setPaymentMessage('This ride belongs to a different account. Please log in as the rider who booked it.');
            return;
        }
        setPaymentLoading(true);
        try {
            if (!razorpayReady || !window.Razorpay) {
                throw new Error('Razorpay Checkout is still loading. Please try again in a moment.');
            }
            const orderData = await paymentService.createOrder(ride.ride_id);
            const result = await new Promise((resolve, reject) => {
                const checkout = new window.Razorpay({
                    key: orderData.key_id,
                    amount: orderData.order.amount,
                    currency: orderData.order.currency,
                    name: 'Global Ride',
                    description: `Ride #${ride.ride_id}`,
                    order_id: orderData.order.id,
                    prefill: { name: form.clientName, contact: form.clientPhone },
                    handler: async (response) => {
                        try { resolve(await paymentService.verifyRazorpayPayment({ ride_id: ride.ride_id, ...response })); } catch (error) { reject(error); }
                    },
                    modal: { ondismiss: () => reject(new Error('Payment window closed')) },
                });
                checkout.open();
            });
            setRide((currentRide) => ({ ...currentRide, ...result }));
            setPaymentMessage(result.message || 'Payment processed successfully');
            setStatus(result.status || 'Completed');
            setRatingOpen(true);
        } catch (err) {
            const message = err?.response?.data?.detail || err.message || 'Payment failed';
            setPaymentMessage(message);
        } finally {
            setPaymentLoading(false);
        }
    };

    const debounceFetchSuggestions = (field, value) => {
        clearTimeout(suggestionTimer.current);
        if (!value || value.length < 3) {
            setSuggestions((prev) => ({ ...prev, [field]: [] }));
            return;
        }

        suggestionTimer.current = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=0&q=${encodeURIComponent(value)}`
                );
                const items = await response.json();
                setSuggestions((prev) => ({
                    ...prev,
                    [field]: items.map((item) => ({
                        label: item.display_name,
                        lat: Number(item.lat),
                        lon: Number(item.lon),
                    })),
                }));
            } catch (error) {
                setSuggestions((prev) => ({ ...prev, [field]: [] }));
            }
        }, 300);
    };

    const updateAddress = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === 'pickup' ? { pickupLat: null, pickupLng: null } : {}),
            ...(field === 'drop' ? { dropLat: null, dropLng: null } : {}),
        }));
        setSuggestions((prev) => ({ ...prev, [field]: [] }));
    };

    const selectSuggestion = (field, item) => {
        setForm((prev) => ({
            ...prev,
            [field]: item.label,
            ...(field === 'pickup' ? { pickupLat: item.lat, pickupLng: item.lon } : { dropLat: item.lat, dropLng: item.lon }),
        }));
        setSuggestions((prev) => ({ ...prev, [field]: [] }));
    };

    const loadEstimate = async () => {
        if (!form.pickup || !form.drop) {
            setEstimate(null);
            return;
        }
        setEstimateLoading(true);
        try {
            const data = await rideService.estimateRide(form);
            setEstimate(data);
        } catch (error) {
            console.error('Unable to estimate ride:', error);
            setEstimate(null);
        } finally {
            setEstimateLoading(false);
        }
    };

    useEffect(() => {
        clearTimeout(estimateTimer.current);
        estimateTimer.current = setTimeout(loadEstimate, 500);
        return () => clearTimeout(estimateTimer.current);
    }, [form.pickup, form.drop, form.rideType, form.pickupLat, form.dropLat]);

    useEffect(() => {
        if (!ride?.ride_id) return undefined;

        const poll = async () => {
            try {
                const data = await rideService.getRide(ride.ride_id);
                setRide(data);
                setStatus(data.status || 'Requested');
            } catch (err) {
                console.error('Unable to poll ride status:', err);
            }
        };

        poll();
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [ride?.ride_id]);

    useEffect(() => {
        if (!ride?.ride_id) return undefined;
        const socket = new WebSocket(`${BASE_URL.replace(/^http/, 'ws')}/ws/ride/${ride.ride_id}`);
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'status') setStatus(data.status);
            if (data.type === 'location') setRide((currentRide) => ({ ...currentRide, lat: data.lat, lng: data.lng }));
        };
        return () => socket.close();
    }, [ride?.ride_id]);

    useEffect(() => {
        const existingScript = document.querySelector('script[data-razorpay-checkout]');
        if (existingScript) {
            const frame = window.requestAnimationFrame(() => setRazorpayReady(Boolean(window.Razorpay)));
            const handleLoad = () => setRazorpayReady(true);
            existingScript.addEventListener('load', handleLoad, { once: true });
            return () => {
                window.cancelAnimationFrame(frame);
                existingScript.removeEventListener('load', handleLoad);
            };
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.dataset.razorpayCheckout = 'true';
        script.onload = () => setRazorpayReady(true);
        script.onerror = () => setRazorpayReady(false);
        document.body.appendChild(script);
        return () => {
            script.onload = null;
            script.onerror = null;
        };
    }, []);

    const submitRating = async () => {
        try { await rideService.rateRide(ride.ride_id, rating, feedback); setRatingOpen(false); } catch (err) { alert(err?.response?.data?.detail || 'Unable to save rating'); }
    };

    const previewPickupLat = ride?.pickup_lat ?? estimate?.pickup_lat ?? form.pickupLat;
    const previewPickupLng = ride?.pickup_lng ?? estimate?.pickup_lng ?? form.pickupLng;
    const previewDropLat = ride?.drop_lat ?? estimate?.drop_lat ?? form.dropLat;
    const previewDropLng = ride?.drop_lng ?? estimate?.drop_lng ?? form.dropLng;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
            <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gap: '24px', gridTemplateColumns: '1.6fr 1fr' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h2 style={{ marginTop: 0 }}>Book a ride</h2>
                                <p style={{ color: '#64748b', marginTop: 6 }}>Search pickup/drop by place name and preview distance, duration, and fare before confirming.</p>
                            </div>
                            <Link to="/history" style={{ color: '#2563eb', fontWeight: 700 }}>Ride history</Link>
                        </div>
                        <form onSubmit={bookRide} style={{ marginTop: 24, display: 'grid', gap: 14 }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    value={form.pickup}
                                    onChange={(e) => {
                                        updateAddress('pickup', e.target.value);
                                        debounceFetchSuggestions('pickup', e.target.value);
                                    }}
                                    placeholder="Search pickup location"
                                    style={inputStyle}
                                    required
                                />
                                {suggestions.pickup.length > 0 && (
                                    <div style={suggestionBoxStyle}>
                                        {suggestions.pickup.map((item, index) => (
                                            <button key={index} type="button" style={suggestionButtonStyle} onClick={() => selectSuggestion('pickup', item)}>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    value={form.drop}
                                    onChange={(e) => {
                                        updateAddress('drop', e.target.value);
                                        debounceFetchSuggestions('drop', e.target.value);
                                    }}
                                    placeholder="Search drop location"
                                    style={inputStyle}
                                    required
                                />
                                {suggestions.drop.length > 0 && (
                                    <div style={suggestionBoxStyle}>
                                        {suggestions.drop.map((item, index) => (
                                            <button key={index} type="button" style={suggestionButtonStyle} onClick={() => selectSuggestion('drop', item)}>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <select value={form.rideType} onChange={(e) => setForm((prev) => ({ ...prev, rideType: e.target.value }))} style={inputStyle}>
                                <option value="Economy">Economy Bike</option>
                                <option value="Scooter">Scooter</option>
                                <option value="Premium Bike">Sports / Premium Bike</option>
                            </select>
                            <input value={form.driverChoice} onChange={(e) => setForm((prev) => ({ ...prev, driverChoice: e.target.value }))} placeholder="Driver preference (optional)" style={inputStyle} />
                            <input value={form.clientName} onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))} placeholder="Your name" style={inputStyle} required />
                            <input value={form.clientPhone} onChange={(e) => setForm((prev) => ({ ...prev, clientPhone: e.target.value }))} placeholder="Mobile number" style={inputStyle} required />
                            <button type="submit" disabled={loading} style={primaryButtonStyle}>{loading ? 'Booking...' : 'Book Ride'}</button>
                        </form>
                        <div style={{ marginTop: 24, padding: '22px', borderRadius: 20, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 16px' }}>Trip preview</h3>
                            <div style={summaryRowStyle}><span>Selected ride type</span><strong>{form.rideType}</strong></div>
                            <div style={summaryRowStyle}><span>Total distance</span><strong>{estimateLoading ? 'Calculating...' : estimate?.distance ? `${estimate.distance} km` : '--'}</strong></div>
                            <div style={summaryRowStyle}><span>ETA / duration</span><strong>{estimateLoading ? 'Loading...' : estimate?.estimated_duration_text ?? '--'}</strong></div>
                            <div style={summaryRowStyle}><span>Estimated fare</span><strong>{estimateLoading ? 'Calculating...' : estimate?.fare ? `₹${estimate.fare}` : '--'}</strong></div>
                            <p style={{ marginTop: 14, color: '#475569', fontSize: 14 }}>The estimate updates automatically when pickup, drop, or ride type changes.</p>
                        </div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)' }}>
                        <h3 style={{ marginTop: 0 }}>Route preview</h3>
                        <p style={{ color: '#64748b', marginBottom: 18 }}>A quick map of the current pickup and drop points.</p>
                        <LiveMap pickupLat={previewPickupLat} pickupLng={previewPickupLng} dropLat={previewDropLat} dropLng={previewDropLng} title="Route preview" />
                    </div>
                </div>
                <div style={{ background: '#0f172a', color: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 18px 44px rgba(15, 23, 42, 0.16)' }}>
                    <h3 style={{ marginTop: 0 }}>Live trip status</h3>
                    <p style={{ color: '#cbd5e1' }}>Current status: <strong>{status}</strong></p>
                    {ride ? (
                        <>
                            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                                <p style={{ margin: '4px 0' }}><strong>Ride ID:</strong> {ride.ride_id}</p>
                                <p style={{ margin: '4px 0' }}><strong>Ride type:</strong> {ride.ride_type}</p>
                                <p style={{ margin: '4px 0' }}><strong>Fare:</strong> ₹{ride.fare}</p>
                                <p style={{ margin: '4px 0' }}><strong>Requested driver:</strong> {ride.requested_driver || 'Any available driver'}</p>
                                <p style={{ margin: '4px 0' }}><strong>Driver name:</strong> {ride.captain_name || 'Awaiting assignment'}</p>
                                <p style={{ margin: '4px 0' }}><strong>Driver phone:</strong> {ride.captain_phone || 'Awaiting assignment'}</p>
                                <p style={{ margin: '4px 0' }}><strong>OTP:</strong> {ride.otp || 'Assigned after acceptance'}</p>
                                <p style={{ margin: '4px 0' }}><strong>Payment status:</strong> {ride.payment_status === 'Paid' ? 'Payment successful' : status === 'Completed' ? 'Not yet paid' : 'Pending'}</p>
                                {status === 'Completed' && ride.payment_status !== 'Paid' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <button onClick={handlePayment} disabled={paymentLoading} style={{ padding: '10px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: paymentLoading ? 'not-allowed' : 'pointer' }}>
                                            {paymentLoading ? 'Processing payment...' : 'Pay Now'}
                                        </button>
                                        {paymentMessage && <p style={{ marginTop: '10px', color: '#aeea00' }}>{paymentMessage}</p>}
                                    </div>
                                )}
                            </div>
                            <LiveMap lat={ride.lat || 28.6139} lng={ride.lng || 77.2090} pickupLat={ride.pickup_lat} pickupLng={ride.pickup_lng} dropLat={ride.drop_lat} dropLng={ride.drop_lng} title="Your ride" />
                        </>
                    ) : (
                        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px' }}>Book a ride to see your live status and captain details.</div>
                    )}
                </div>
            </div>
            {ratingOpen && (
                <div style={modalStyle}>
                    <div style={dialogStyle}>
                        <h3>Rate your ride</h3>
                        <p>Your payment is complete. How was the trip?</p>
                        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={inputStyle}>
                            <option value={5}>5 stars</option>
                            <option value={4}>4 stars</option>
                            <option value={3}>3 stars</option>
                            <option value={2}>2 stars</option>
                            <option value={1}>1 star</option>
                        </select>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Share feedback"
                            style={{ ...inputStyle, minHeight: 90 }}
                        />
                        <button onClick={submitRating} style={buttonStyle}>Submit feedback</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '14px',
    marginBottom: '12px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxSizing: 'border-box',
    fontSize: 15,
};
const primaryButtonStyle = {
    width: '100%',
    padding: '14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
};
const paymentButtonStyle = {
    width: '100%',
    padding: '14px 18px',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 700,
};
const suggestionBoxStyle = {
    position: 'absolute',
    top: '56px',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
    zIndex: 20,
    maxHeight: '240px',
    overflowY: 'auto',
};
const suggestionButtonStyle = {
    width: '100%',
    textAlign: 'left',
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    color: '#0f172a',
};
const summaryRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    color: '#334155',
};
const rideDetailStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    margin: '12px 0',
    color: '#e2e8f0',
};
const modalStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.65)',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
};
const dialogStyle = {
    background: '#fff',
    borderRadius: 18,
    padding: 28,
    width: 'min(540px, 100%)',
    color: '#0f172a',
};
const buttonStyle = {
    width: '100%',
    padding: 14,
    background: '#2563eb',
    color: '#fff',
    border: 0,
    borderRadius: 12,
    fontWeight: 700,
};
