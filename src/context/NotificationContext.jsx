import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { LayoutContext } from './LayoutContext';

export const NotificationContext = createContext();

const POLL_INTERVAL_MS = 45000;

export function NotificationProvider({ children }) {
  const { token } = useContext(LayoutContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: authHeaders(),
      });
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [token, authHeaders]);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }

    setLoadingNotifications(true);
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: authHeaders(),
        params: { limit: 50 },
      });
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [token, authHeaders]);

  const markAsRead = useCallback(async (id) => {
    if (!token) return;

    try {
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
        headers: authHeaders(),
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  }, [token, authHeaders]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: authHeaders(),
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  }, [token, authHeaders]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      setNotifications([]);
      return undefined;
    }

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    if (panelOpen && token) {
      fetchNotifications();
    }
  }, [panelOpen, token, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loadingNotifications,
        panelOpen,
        openPanel,
        closePanel,
        fetchUnreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
