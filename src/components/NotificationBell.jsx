import React, { useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { useNotifications } from '../context/NotificationContext';
import { LayoutContext } from '../context/LayoutContext';
import './Social.css';

function NotificationBell() {
  const navigate = useNavigate();
  const { token } = useContext(LayoutContext);
  const {
    unreadCount,
    notifications,
    loadingNotifications,
    panelOpen,
    openPanel,
    closePanel,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelOpen) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen, closePanel]);

  if (!token) return null;

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    closePanel();

    if (notification.type === 'connection_request' && notification.payload?.fromUserId) {
      navigate(`/profile/${notification.payload.fromUserId}`);
      return;
    }

    if (notification.type === 'connection_accepted' && notification.payload?.fromUserId) {
      navigate(`/profile/${notification.payload.fromUserId}`);
      return;
    }

    if (notification.type === 'new_message' && notification.payload?.fromUserId) {
      navigate(`/messages?user=${notification.payload.fromUserId}`);
      return;
    }

    if (notification.type === 'forum_thread' || notification.type === 'forum_reply') {
      if (notification.payload?.threadId) {
        navigate(`/forum/${notification.payload.threadId}`);
        return;
      }
    }

    if (notification.type === 'layout_published' && notification.payload?.layoutId) {
      navigate(`/layout/${notification.payload.layoutId}`);
      return;
    }

    if (notification.payload?.layoutId) {
      navigate(`/layout/${notification.payload.layoutId}`);
    }
  };

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button
        type="button"
        className={`menu-link notification-bell-btn${panelOpen ? ' active' : ''}`}
        aria-label="Notifications"
        onClick={() => (panelOpen ? closePanel() : openPanel())}
      >
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        <span className="menu-tooltip">Notifications</span>
      </button>

      {panelOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-ghost btn-xs" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-panel-body scroll-panel">
            {loadingNotifications ? (
              <p className="notification-empty">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="notification-empty">No notifications yet.</p>
            ) : (
              <ul className="notification-list">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-item${notification.read ? '' : ' unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="notification-title">{notification.title}</span>
                      <span className="notification-body">{notification.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
