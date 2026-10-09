import API from './api';

const authConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Please log in again before paying for this ride.');
    }
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const paymentService = {
    createOrder: async (rideId) => {
        const response = await API.post('/payment/create-order', { ride_id: rideId }, authConfig());
        return response.data;
    },

    verifyPayment: async (rideId, paymentMethod = 'Online / Cash') => {
        const response = await API.post(
            '/payment/verify',
            {
                ride_id: rideId,
                payment_method: paymentMethod,
            },
            { ...authConfig(), headers: { ...authConfig().headers, 'Content-Type': 'application/json' } }
        );
        return response.data;
    },

    verifyRazorpayPayment: async (payment) => {
        const response = await API.post('/payment/verify', payment, authConfig());
        return response.data;
    },
};