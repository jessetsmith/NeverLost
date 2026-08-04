import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import { useNotifications } from '../context/NotificationContext';
import './Social.css';

function InviteAcceptModal() {
  const navigate = useNavigate();
  const { fetchUnreadCount } = useNotifications();
  const [activeInvite, setActiveInvite] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const loadPendingInvite = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setActiveInvite(null);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: authHeaders(),
        params: { limit: 50 },
      });
      const pendingInvite = (response.data.notifications || []).find(
        (notification) => notification.type === 'layout_invite' && !notification.read,
      );
      setActiveInvite(pendingInvite || null);
      setError('');
    } catch (err) {
      console.error('Error loading pending invites:', err);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadPendingInvite();
    const intervalId = setInterval(loadPendingInvite, 45000);
    return () => clearInterval(intervalId);
  }, [loadPendingInvite]);

  const dismissInvite = useCallback(async () => {
    if (!activeInvite) return;
    try {
      await axios.put(`${API_URL}/notifications/${activeInvite.id}/read`, {}, {
        headers: authHeaders(),
      });
      await fetchUnreadCount();
      await loadPendingInvite();
    } catch (err) {
      console.error('Error dismissing invite notification:', err);
    }
  }, [activeInvite, authHeaders, fetchUnreadCount, loadPendingInvite]);

  const handleAccept = async () => {
    if (!activeInvite?.payload?.layoutId) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/layouts/invites/${activeInvite.payload.layoutId}/accept`,
        {},
        { headers: authHeaders() },
      );
      await dismissInvite();
      navigate(`/layout/${activeInvite.payload.layoutId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!activeInvite?.payload?.layoutId) return;

    setSubmitting(true);
    setError('');

    try {
      await axios.post(
        `${API_URL}/layouts/invites/${activeInvite.payload.layoutId}/decline`,
        {},
        { headers: authHeaders() },
      );
      await dismissInvite();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline invite.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeInvite) return null;

  const layoutName = activeInvite.payload?.layoutName || 'a layout';
  const inviteRole = activeInvite.payload?.role === 'viewer' ? 'view' : 'edit';

  return (
    <div className="modal-overlay invite-modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card invite-modal">
        <h2>Layout collaboration invite</h2>
        <p>
          You were invited to {inviteRole} <strong>{layoutName}</strong>.
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

export default InviteAcceptModal;
