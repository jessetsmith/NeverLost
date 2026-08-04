import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import { useNotifications } from '../context/NotificationContext';
import './Social.css';

function ConnectionRequestModal() {
  const navigate = useNavigate();
  const { fetchUnreadCount } = useNotifications();
  const [activeRequest, setActiveRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const loadPendingRequest = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setActiveRequest(null);
      return;
    }

    try {
      const [notificationsResponse, requestsResponse] = await Promise.all([
        axios.get(`${API_URL}/notifications`, {
          headers: authHeaders(),
          params: { limit: 50 },
        }),
        axios.get(`${API_URL}/connections/requests`, {
          headers: authHeaders(),
        }),
      ]);

      const pendingNotification = (notificationsResponse.data.notifications || []).find(
        (notification) => notification.type === 'connection_request' && !notification.read,
      );

      if (!pendingNotification) {
        setActiveRequest(null);
        setError('');
        return;
      }

      const pendingRequest = (requestsResponse.data.requests || []).find(
        (request) => request.id === pendingNotification.payload?.connectionId,
      );

      setActiveRequest({
        notification: pendingNotification,
        request: pendingRequest || {
          id: pendingNotification.payload?.connectionId,
          userId: pendingNotification.payload?.fromUserId,
          username: pendingNotification.payload?.fromUsername || 'Someone',
        },
      });
      setError('');
    } catch (err) {
      console.error('Error loading connection requests:', err);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadPendingRequest();
    const intervalId = setInterval(loadPendingRequest, 45000);
    return () => clearInterval(intervalId);
  }, [loadPendingRequest]);

  const dismissNotification = useCallback(async () => {
    if (!activeRequest?.notification) return;
    try {
      await axios.put(`${API_URL}/notifications/${activeRequest.notification.id}/read`, {}, {
        headers: authHeaders(),
      });
      await fetchUnreadCount();
      await loadPendingRequest();
    } catch (err) {
      console.error('Error dismissing connection notification:', err);
    }
  }, [activeRequest, authHeaders, fetchUnreadCount, loadPendingRequest]);

  const handleAccept = async () => {
    if (!activeRequest?.request?.id) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/connections/requests/${activeRequest.request.id}/accept`,
        {},
        { headers: authHeaders() },
      );
      await dismissNotification();
      navigate(`/profile/${activeRequest.request.userId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept connection request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!activeRequest?.request?.id) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/connections/requests/${activeRequest.request.id}/decline`,
        {},
        { headers: authHeaders() },
      );
      await dismissNotification();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline connection request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeRequest) return null;

  const requesterName = activeRequest.request?.username || 'Someone';

  return (
    <div className="modal-overlay invite-modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card invite-modal">
        <h2>Connection request</h2>
        <p>
          <strong>{requesterName}</strong> wants to connect with you.
        </p>
        {error && <p className="error-message">{error}</p>}
        <div className="invite-modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={submitting}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDecline}
            disabled={submitting}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectionRequestModal;
