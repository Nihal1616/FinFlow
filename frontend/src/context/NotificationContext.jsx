import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [toasts, setToasts]         = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Toast helpers
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Socket.io – connect when user is authenticated
  useEffect(() => {
    if (!user || !token) return;

    const socket = io("https://finflow-g8bp.onrender.com", { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', user._id);
    });

    socket.on('payment_received', ({ from, amount }) => {
      const msg = `₹${Number(amount).toLocaleString('en-IN')} received from ${from}!`;
      addToast(msg, 'success', 6000);
      setNotifications(prev => [{ id: Date.now(), message: msg, time: new Date() }, ...prev]);
    });

    socket.on('fraud_alert', ({ message }) => {
      addToast('⚠ ' + message, 'warning', 8000);
    });

    return () => socket.disconnect();
  }, [user, token, addToast]);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{
      toasts, addToast, removeToast,
      notifications, clearNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
