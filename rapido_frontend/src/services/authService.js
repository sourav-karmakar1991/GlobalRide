import API from './api';

const DEMO_ADMIN_EMAIL = 'admin@eziride.com';
const DEMO_ADMIN_PASSWORD = 'admin123';
const DEMO_RIDER_EMAIL = 'rider@eziride.com';
const DEMO_RIDER_PASSWORD = 'rider123';
const DEMO_DRIVER_EMAIL = 'driver@eziride.com';
const DEMO_DRIVER_PASSWORD = 'driver123';

const persistDemoUsers = (users) => {
    localStorage.setItem('rapido_demo_users', JSON.stringify(users));
};

const getDemoUsers = () => {
    try {
        const raw = localStorage.getItem('rapido_demo_users');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const ensureDemoAccounts = () => {
    const users = getDemoUsers();
    const defaults = [
        { id: 1, full_name: 'System Admin', email: DEMO_ADMIN_EMAIL, phone: '9999999999', password: DEMO_ADMIN_PASSWORD, role: 'admin' },
        { id: 2, full_name: 'Demo Rider', email: DEMO_RIDER_EMAIL, phone: '9999999998', password: DEMO_RIDER_PASSWORD, role: 'rider' },
        { id: 3, full_name: 'Demo Driver', email: DEMO_DRIVER_EMAIL, phone: '9999999997', password: DEMO_DRIVER_PASSWORD, role: 'driver' },
    ];

    defaults.forEach((user) => {
        const exists = users.some((saved) => saved.email?.toLowerCase() === user.email.toLowerCase());
        if (!exists) {
            users.push(user);
        }
    });
    persistDemoUsers(users);
    return users;
};

const createDemoLoginResponse = (user) => ({
    access_token: `demo-${user.role}-token`,
    token_type: 'bearer',
    role: user.role,
    user_id: user.id,
    full_name: user.full_name,
});

export const registerUser = async (userData) => {
    const payload = {
        full_name: userData.full_name || userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: userData.role || 'rider',
        ...(userData.vehicle_number ? { vehicle_number: userData.vehicle_number } : {}),
    };

    if (payload.role === 'admin') {
        const users = getDemoUsers();
        const existing = users.find((user) => user.email?.toLowerCase() === String(payload.email).toLowerCase());
        if (!existing) {
            users.push({
                id: Date.now(),
                ...payload,
            });
            persistDemoUsers(users);
        }
        return createDemoLoginResponse({
            id: existing?.id || Date.now(),
            full_name: payload.full_name,
            role: 'admin',
        });
    }

    try {
        const response = await API.post('/auth/register', payload);
        return response.data;
    } catch (error) {
        if (String(error?.message || '').toLowerCase().includes('network') || String(error?.code || '').toLowerCase() === 'err_network') {
            const users = getDemoUsers();
            const existing = users.find((user) => user.email?.toLowerCase() === String(payload.email).toLowerCase());
            if (!existing) {
                users.push({
                    id: Date.now(),
                    ...payload,
                });
                persistDemoUsers(users);
            }
            return createDemoLoginResponse({
                id: existing?.id || Date.now(),
                full_name: payload.full_name,
                role: payload.role,
            });
        }
        throw error;
    }
};

export const loginUser = async (credentials) => {
    const email = String(credentials.username || credentials.email || '').trim().toLowerCase();
    const password = String(credentials.password || '');

    const demoUsers = ensureDemoAccounts();

    if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
        const admin = demoUsers.find((user) => user.email?.toLowerCase() === DEMO_ADMIN_EMAIL);
        return createDemoLoginResponse({
            id: admin?.id || 1,
            full_name: admin?.full_name || 'System Admin',
            role: 'admin',
        });
    }

    if (email === DEMO_RIDER_EMAIL && password === DEMO_RIDER_PASSWORD) {
        const rider = demoUsers.find((user) => user.email?.toLowerCase() === DEMO_RIDER_EMAIL);
        return createDemoLoginResponse({
            id: rider?.id || 2,
            full_name: rider?.full_name || 'Demo Rider',
            role: 'rider',
        });
    }

    if (email === DEMO_DRIVER_EMAIL && password === DEMO_DRIVER_PASSWORD) {
        const driver = demoUsers.find((user) => user.email?.toLowerCase() === DEMO_DRIVER_EMAIL);
        return createDemoLoginResponse({
            id: driver?.id || 3,
            full_name: driver?.full_name || 'Demo Driver',
            role: 'driver',
        });
    }

    const matchingUser = demoUsers.find(
        (user) => user.email?.toLowerCase() === email && user.password === password
    );
    if (matchingUser) {
        return createDemoLoginResponse({
            id: matchingUser.id,
            full_name: matchingUser.full_name,
            role: matchingUser.role || 'rider',
        });
    }

    const params = new URLSearchParams();
    params.append('username', credentials.username || credentials.email);
    params.append('password', credentials.password);

    try {
        const response = await API.post('/auth/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    } catch (error) {
        if (String(error?.message || '').toLowerCase().includes('network') || String(error?.code || '').toLowerCase() === 'err_network') {
            const fallbackUser = getDemoUsers().find((user) => user.email?.toLowerCase() === email);
            if (fallbackUser && fallbackUser.password === password) {
                return createDemoLoginResponse({
                    id: fallbackUser.id,
                    full_name: fallbackUser.full_name,
                    role: fallbackUser.role || 'rider',
                });
            }
            throw new Error('Invalid email or password. Use admin@eziride.com / admin123 for the admin demo account.');
        }
        throw error;
    }
};