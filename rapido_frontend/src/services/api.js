import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
export const BASE_URL = configuredApiUrl
    ? (/^https?:\/\//i.test(configuredApiUrl) ? configuredApiUrl : `https://${configuredApiUrl}`)
    : 'http://localhost:8000';

const API = axios.create({
    baseURL: BASE_URL,
});

export default API;