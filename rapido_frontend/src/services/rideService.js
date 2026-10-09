import API from './api';

const DEMO_RIDE_KEY = 'eziride_demo_rides';

const authConfig = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
        },
    };
};

const ridePath = (rideId) => {
    const numericRideId = Number(rideId);
    if (!Number.isInteger(numericRideId) || numericRideId <= 0) {
        throw new Error('A valid ride ID is required');
    }
    return `/rides/${numericRideId}`;
};

const readDemoRides = () => {
    try {
        const saved = localStorage.getItem(DEMO_RIDE_KEY);
        if (!saved) {
            const initial = [
                {
                    ride_id: 1001,
                    user_id: 2,
                    pickup: 'Connaught Place',
                    drop: 'India Gate',
                    ride_type: 'Economy',
                    client_name: 'Demo Rider',
                    client_phone: '9999999999',
                    driver_choice: '',
                    status: 'Completed',
                    fare: 290,
                    pickup_lat: 28.6304,
                    pickup_lng: 77.2167,
                    drop_lat: 28.6129,
                    drop_lng: 77.2295,
                    created_at: new Date().toISOString(),
                },
            ];
            localStorage.setItem(DEMO_RIDE_KEY, JSON.stringify(initial));
            return initial;
        }
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const saveDemoRides = (rides) => {
    localStorage.setItem(DEMO_RIDE_KEY, JSON.stringify(rides));
};

const fallbackEstimate = (rideData) => {
    const pickupLat = Number(rideData.pickupLat ?? 28.6304);
    const pickupLng = Number(rideData.pickupLng ?? 77.2167);
    const dropLat = Number(rideData.dropLat ?? 28.6129);
    const dropLng = Number(rideData.dropLng ?? 77.2295);
    const distanceKm = Math.max(4, Math.round(Math.sqrt(((dropLat - pickupLat) ** 2) + ((dropLng - pickupLng) ** 2)) * 100 * 10) / 10);
    const durationMin = Math.max(10, Math.round(distanceKm * 3.2));
    const baseFare = rideData.rideType === 'Scooter' ? 180 : rideData.rideType === 'Sports / Premium Bike' ? 260 : 150;
    const fare = Math.max(120, Math.round(baseFare + distanceKm * 12));

    return {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_lat: dropLat,
        drop_lng: dropLng,
        distance_km: distanceKm,
        duration_min: durationMin,
        fare,
        status: 'Estimated',
    };
};

const fallbackRideFromData = (rideData) => {
    const estimated = fallbackEstimate(rideData);
    const userId = Number(localStorage.getItem('userId')) || 2;
    const ride = {
        ride_id: Date.now(),
        user_id: userId,
        pickup: rideData.pickup,
        drop: rideData.drop,
        ride_type: rideData.rideType || 'Economy',
        client_name: rideData.clientName || 'Demo Rider',
        client_phone: rideData.clientPhone || '9999999999',
        driver_choice: rideData.driverChoice || '',
        status: 'Requested',
        fare: estimated.fare,
        pickup_lat: estimated.pickup_lat,
        pickup_lng: estimated.pickup_lng,
        drop_lat: estimated.drop_lat,
        drop_lng: estimated.drop_lng,
        created_at: new Date().toISOString(),
    };

    return ride;
};

const updateDemoRideStatus = (rideId, status, updates = {}) => {
    const rides = readDemoRides();
    const nextRides = rides.map((ride) => {
        if (Number(ride.ride_id) !== Number(rideId)) return ride;
        return { ...ride, ...updates, status };
    });
    saveDemoRides(nextRides);
    return nextRides.find((ride) => Number(ride.ride_id) === Number(rideId));
};

export const rideService = {
    bookRide: async (rideData) => {
        const token = localStorage.getItem('token');
        try {
            const response = await API.post(
                '/rides/request',
                {
                    pickup: rideData.pickup,
                    drop: rideData.drop,
                    ride_type: rideData.rideType || 'Economy',
                    client_name: rideData.clientName,
                    client_phone: rideData.clientPhone,
                    driver_choice: rideData.driverChoice,
                    pickup_lat: rideData.pickupLat,
                    pickup_lng: rideData.pickupLng,
                    drop_lat: rideData.dropLat,
                    drop_lng: rideData.dropLng,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token ? `Bearer ${token}` : undefined,
                    },
                }
            );
            return response.data;
        } catch (error) {
            const demoRide = fallbackRideFromData(rideData);
            const rides = readDemoRides();
            rides.unshift(demoRide);
            saveDemoRides(rides);
            return demoRide;
        }
    },

    getRide: async (rideId) => {
        try {
            const response = await API.get(ridePath(rideId), authConfig());
            return response.data;
        } catch (error) {
            const rides = readDemoRides();
            const ride = rides.find((item) => Number(item.ride_id) === Number(rideId));
            if (ride) return ride;
            throw error;
        }
    },

    estimateRide: async (rideData) => {
        try {
            const response = await API.get('/rides/estimate', {
                params: {
                    pickup: rideData.pickup,
                    drop: rideData.drop,
                    ride_type: rideData.rideType || 'Economy',
                    pickup_lat: rideData.pickupLat,
                    pickup_lng: rideData.pickupLng,
                    drop_lat: rideData.dropLat,
                    drop_lng: rideData.dropLng,
                },
            });
            return response.data;
        } catch (error) {
            return fallbackEstimate(rideData);
        }
    },

    getAvailableRides: async () => {
        try {
            const response = await API.get('/rides/available', authConfig());
            return response.data;
        } catch (error) {
            return readDemoRides().filter((ride) => ['Requested', 'Accepted', 'Ongoing'].includes(ride.status));
        }
    },

    acceptRide: async (rideId) => {
        try {
            const response = await API.post(`${ridePath(rideId)}/accept`, {}, authConfig());
            return response.data;
        } catch (error) {
            const updated = updateDemoRideStatus(rideId, 'Accepted', { driver_name: 'Demo Driver', otp: '123456' });
            return updated || { status: 'Accepted', otp: '123456' };
        }
    },

    startRide: async (rideId, enteredOtp) => {
        try {
            const response = await API.post(`${ridePath(rideId)}/start`, null, { ...authConfig(), params: { entered_otp: enteredOtp } });
            return response.data;
        } catch (error) {
            const updated = updateDemoRideStatus(rideId, 'Ongoing', { otp: enteredOtp || '123456' });
            return updated || { status: 'Ongoing' };
        }
    },

    completeRide: async (rideId) => {
        try {
            const response = await API.post(`${ridePath(rideId)}/complete`, null, authConfig());
            return response.data;
        } catch (error) {
            const updated = updateDemoRideStatus(rideId, 'Completed');
            return updated || { status: 'Completed' };
        }
    },

    getHistory: async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await API.get('/history/rides', { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
            return response.data;
        } catch (error) {
            const userId = Number(localStorage.getItem('userId')) || 2;
            const rides = readDemoRides().filter((ride) => {
                const sameUser = Number(ride.user_id) === userId;
                return sameUser || ride.status === 'Completed';
            });
            return rides;
        }
    },

    rateRide: async (rideId, stars, feedback) => {
        const token = localStorage.getItem('token');
        try {
            const response = await API.post('/history/ratings', { ride_id: rideId, stars, feedback }, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
            return response.data;
        } catch (error) {
            return { ride_id: rideId, stars, feedback, status: 'rated' };
        }
    },
};