import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import './Social.css';

const PERMISSION_OPTIONS = [
  { value: 'editor', label: 'Editor', description: 'Can view and edit the layout' },
  { value: 'viewer', label: 'Read-only', description: 'Can view but not edit' },
];

function roleLabel(role) {
  if (role === 'viewer') return 'Read-only';
  if (role === 'editor') return 'Editor';
  return role;
}

function ShareLayoutModal({ isOpen, layoutId, onClose }) {
  const [inviteValue, setInviteValue] = useState('');
  const [inviteType, setInviteType] = useState('username');
  const [inviteRole, setInviteRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const fetchCollaborators = useCallback(async () => {
    if (!layoutId) return;

    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/layouts/${layoutId}/collaborators`, {
        headers: authHeaders(),
      });
      setCollaborators(response.data.collaborators || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load collaborators.');
    } finally {
      setLoading(false);
    }
  }, [layoutId, authHeaders]);

  useEffect(() => {
    if (isOpen) {
      setInviteValue('');
      setInviteRole('editor');
      setError('');
      setSuccess('');
      fetchCollaborators();
    }
  }, [isOpen, fetchCollaborators]);

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!inviteValue.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const body = inviteType === 'email' ?
        { email: inviteValue.trim(), role: inviteRole } :
        { username: inviteValue.trim(), role: inviteRole };

      await axios.post(`${API_URL}/layouts/${layoutId}/invites`, body, {
        headers: authHeaders(),
      });

      setSuccess('Invite sent.');
      setInviteValue('');
      fetchCollaborators();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId) => {
    setError('');
    try {
      await axios.delete(`${API_URL}/layouts/${layoutId}/collaborators/${userId}`, {
        headers: authHeaders(),
      });
      fetchCollaborators();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove collaborator.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="share-layout-title">
      <div className="modal-card share-modal">
        <div className="modal-header">
          <h2 id="share-layout-title">Share Layout</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="share-invite-form" onSubmit={handleInvite}>
          <label htmlFor="invite-type">Invite by</label>
          <div className="share-invite-row">
            <select
              id="invite-type"
              value={inviteType}
              onChange={(event) => setInviteType(event.target.value)}
            >
              <option value="username">Username</option>
              <option value="email">Email</option>
            </select>
            <input
              type={inviteType === 'email' ? 'email' : 'text'}
              placeholder={inviteType === 'email' ? 'user@example.com' : 'username'}
              value={inviteValue}
              onChange={(event) => setInviteValue(event.target.value)}
            />
          </div>

          <label htmlFor="invite-role" className="share-permission-label">
            Permission
          </label>
          <div className="share-permission-options">
            {PERMISSION_OPTIONS.map((option) => (
              <label key={option.value} className="share-permission-option">
                <input
                  type="radio"
                  name="invite-role"
                  id={`invite-role-${option.value}`}
                  value={option.value}
                  checked={inviteRole === option.value}
                  onChange={() => setInviteRole(option.value)}
                />
                <span className="share-permission-copy">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="share-invite-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <div className="share-collaborators">
          <h3>Shared with</h3>
          {loading ? (
            <p className="loading-state">Loading…</p>
          ) : collaborators.length === 0 ? (
            <p className="text-muted">No collaborators yet.</p>
          ) : (
            <ul className="collaborator-list">
              {collaborators.map((entry) => (
                <li key={entry.userId}>
                  <div>
                    <strong>{entry.username || entry.email || entry.userId}</strong>
                    <span className={`role-badge role-${entry.role || 'editor'}`}>
                      {roleLabel(entry.role || 'editor')}
                    </span>
                    <span className={`status-badge status-${entry.status}`}>{entry.status}</span>
                  </div>
                  {entry.status !== 'declined' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleRemove(entry.userId)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareLayoutModal;
