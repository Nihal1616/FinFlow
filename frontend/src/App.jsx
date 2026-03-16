import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Landing         from './pages/Landing';
import Login           from './pages/Login';
import Register        from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import Dashboard       from './pages/Dashboard';
import SendMoney       from './pages/SendMoney';
import Wallet          from './pages/Wallet';
import TransactionHistory from './pages/TransactionHistory';
import QRPay           from './pages/QRPay';
import Profile         from './pages/Profile';
import NotificationToast from './components/NotificationToast';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <NotificationToast />
      <Routes>
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }>
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="send"         element={<SendMoney />} />
          <Route path="wallet"       element={<Wallet />} />
          <Route path="history"      element={<TransactionHistory />} />
          <Route path="qr"           element={<QRPay />} />
          <Route path="profile"      element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
