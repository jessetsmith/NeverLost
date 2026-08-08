import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { LayoutContext } from '../context/LayoutContext';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';

function ForumAuthorMeta({
  authorUserId,
  authorUsername,
  connectionStatus: initialStatus = 'none',
  pendingRequestId: initialRequestId = null,
  onStatusChange,
  stopPropagation = false,
}) {
  const { user } = useContext(LayoutContext);
  const currentUserId = user?.id;
  const [connectionStatus, setConnectionStatus] = useState(initialStatus);
  const [pendingRequestId, setPendingRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConnectionStatus(initialStatus);
    setPendingRequestId(initialRequestId);
  }, [initialStatus, initialRequestId, authorUserId]);

  const isSelf = !authorUserId || authorUserId === currentUserId;

  const authHeaders = () => ({
    Authorization: `Bearer ${getAuthToken()}`,
  });

  const updateStatus = (status, requestId = null) => {
    setConnectionStatus(status);
    setPendingRequestId(requestId);
    onStatusChange?.(authorUserId, status, requestId);
  };

  const handleContainerClick = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  const handleAddConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/connections`,
        { userId: authorUserId },
        { headers: authHeaders() },
      );
      updateStatus(response.data.connectionStatus || 'pending_outgoing');
    } catch (err) {
      console.error('Failed to send connection request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!pendingRequestId) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/connections/requests/${pendingRequestId}/accept`,
        {},
        { headers: authHeaders() },
      );
      updateStatus('connected');
    } catch (err) {
      console.error('Failed to accept connection request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineConnection = async () => {
    if (!pendingRequestId) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/connections/requests/${pendingRequestId}/decline`,
        {},
        { headers: authHeaders() },
      );
      updateStatus('none');
    } catch (err) {
      console.error('Failed to decline connection request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/connections/${authorUserId}`, { headers: authHeaders() });
      updateStatus('none');
    } catch (err) {
      console.error('Failed to remove connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderConnectionAction = () => {
    if (connectionStatus === 'connected') {
      return (
        <button
          type="button"
          className="btn btn-ghost btn-xs forum-author-action"
          disabled={loading}
          onClick={handleRemoveConnection}
        >
          Connected
        </button>
      );
    }

    if (connectionStatus === 'pending_outgoing') {
      return (
        <button
          type="button"
          className="btn btn-ghost btn-xs forum-author-action"
          disabled={loading}
          onClick={handleRemoveConnection}
        >
          Request sent
        </button>
      );
    }

    if (connectionStatus === 'pending_incoming') {
      return (
        <>
          <button
            type="button"
            className="btn btn-primary btn-xs forum-author-action"
            disabled={loading}
            onClick={handleAcceptConnection}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs forum-author-action"
            disabled={loading}
            onClick={handleDeclineConnection}
          >
            Decline
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        className="btn btn-primary btn-xs forum-author-action"
        disabled={loading}
        onClick={handleAddConnection}
      >
        Add connection
      </button>
    );
  };

  return (
    <span className="forum-author-meta" onClick={handleContainerClick}>
      <Link
        to={`/profile/${authorUserId}`}
        className="forum-author-link"
        onClick={handleContainerClick}
      >
        {authorUsername}
      </Link>
      {!isSelf && (
        <span className="forum-author-actions">
          {renderConnectionAction()}
        </span>
      )}
    </span>
  );
}

export default ForumAuthorMeta;
