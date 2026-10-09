import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderHome from './pages/RiderHome';
import DriverHome from './pages/DriverHome';
import AdminHome from './pages/AdminHome';
import History from './pages/History';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/rider" element={<RiderHome />} />
                <Route path="/rides" element={<RiderHome />} />
                <Route path="/driver" element={<DriverHome />} />
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/history" element={<History />} />
            </Routes>
        </Router>
    );
}