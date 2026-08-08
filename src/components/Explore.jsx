import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Menu from './Menu';
import LayoutThumbnail from './LayoutThumbnail';
import ProfileAvatar from './ProfileAvatar';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import './Explore.css';
import './LayoutCard.css';
import './Profile.css';

function Explore() {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('username');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchOwner, setSearchOwner] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const fetchExplore = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      const params = { page, limit: 20 };
      if (searchEmail) {
        params.email = searchEmail;
      }
      if (searchUsername) {
        params.username = searchUsername;
      }

      const response = await axios.get(`${API_URL}/layouts/explore`, {
        headers: authHeaders(),
        params,
      });
      setLayouts(response.data.layouts || []);
      setTotalPages(response.data.totalPages || 1);
      setSearchOwner(response.data.owner || null);
      setConnectionStatus(response.data.connectionStatus || (response.data.isConnected ? 'connected' : 'none'));
    } catch (err) {
      console.error('Error fetching explore layouts:', err);
      setError(err.response?.data?.error || 'Failed to load published layouts.');
      setLayouts([]);
      setSearchOwner(null);
      setConnectionStatus('none');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [page, searchEmail, searchUsername, authHeaders]);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSearchEmail('');
      setSearchUsername('');
      setPage(1);
      return;
    }

    if (searchType === 'email') {
      setSearchEmail(trimmed.toLowerCase());
      setSearchUsername('');
    } else {
      setSearchUsername(trimmed);
      setSearchEmail('');
    }
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchEmail('');
    setSearchUsername('');
    setSearchOwner(null);
    setConnectionStatus('none');
    setPage(1);
  };

  const handleAddConnection = async (targetUserId) => {
    setConnectionActionLoading(true);
    setConnectionError('');
    try {
      const response = await axios.post(`${API_URL}/connections`, { userId: targetUserId }, { headers: authHeaders() });
      if (searchOwner?.userId === targetUserId) {
        setConnectionStatus(response.data.connectionStatus || 'pending_outgoing');
      }
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to send connection request.');
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const handleAcceptConnection = async (requestId, targetUserId) => {
    setConnectionActionLoading(true);
    setConnectionError('');
    try {
      await axios.post(`${API_URL}/connections/requests/${requestId}/accept`, {}, { headers: authHeaders() });
      if (searchOwner?.userId === targetUserId) {
        setConnectionStatus('connected');
        await fetchExplore({ silent: true });
      }
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to accept connection request.');
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const handleDeclineConnection = async (requestId, targetUserId) => {
    setConnectionActionLoading(true);
    setConnectionError('');
    try {
      await axios.post(`${API_URL}/connections/requests/${requestId}/decline`, {}, { headers: authHeaders() });
      if (searchOwner?.userId === targetUserId) {
        setConnectionStatus('none');
      }
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to decline connection request.');
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const handleRemoveConnection = async (targetUserId) => {
    setConnectionActionLoading(true);
    setConnectionError('');
    try {
      await axios.delete(`${API_URL}/connections/${targetUserId}`, { headers: authHeaders() });
      if (searchOwner?.userId === targetUserId) {
        setConnectionStatus('none');
        await fetchExplore({ silent: true });
      }
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to remove connection.');
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const getIncomingRequestForUser = (targetUserId) => (
    searchOwner?.userId === targetUserId && searchOwner.pendingRequestId ?
      { id: searchOwner.pendingRequestId, userId: targetUserId } :
      null
  );

  const renderConnectionAction = (targetUserId) => {
    const incomingRequest = getIncomingRequestForUser(targetUserId);
    const status = searchOwner?.userId === targetUserId ? connectionStatus : 'none';

    if (status === 'connected') {
      return (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={connectionActionLoading}
          onClick={() => handleRemoveConnection(targetUserId)}
        >
          Remove
        </button>
      );
    }

    if (status === 'pending_outgoing') {
      return (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={connectionActionLoading}
          onClick={() => handleRemoveConnection(targetUserId)}
        >
          Cancel
        </button>
      );
    }

    if (status === 'pending_incoming' && incomingRequest) {
      return (
        <>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            disabled={connectionActionLoading}
            onClick={() => handleAcceptConnection(incomingRequest.id, targetUserId)}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={connectionActionLoading}
            onClick={() => handleDeclineConnection(incomingRequest.id, targetUserId)}
          >
            Decline
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        className="btn btn-primary btn-xs"
        disabled={connectionActionLoading}
        onClick={() => handleAddConnection(targetUserId)}
      >
        Add connection
      </button>
    );
  };

  const hasActiveSearch = Boolean(searchEmail || searchUsername);
  const searchLabel = searchEmail || searchUsername;
  const emptyMessage = hasActiveSearch ?
    `No published layouts found for ${searchLabel}.` :
    'No published layouts yet. Publish one from your layout view to share it here.';

  return (
    <div className="app-shell explore-container">
      <Menu />
      <div className="app-main">
        <header className="page-header explore-header">
          <h2>Explore <span>Gallery</span></h2>
          <p className="explore-subtitle">Browse published layouts and connect with other creators.</p>
        </header>
        <div className="explore-content">
          <form className="explore-search" onSubmit={handleSearch}>
            <label htmlFor="explore-search-input" className="explore-search-label">
              Search by username or email
            </label>
            <div className="explore-search-row">
              <select
                id="explore-search-type"
                value={searchType}
                onChange={(event) => setSearchType(event.target.value)}
                aria-label="Search type"
              >
                <option value="username">Username</option>
                <option value="email">Email</option>
              </select>
              <input
                id="explore-search-input"
                type={searchType === 'email' ? 'email' : 'text'}
                placeholder={searchType === 'email' ? 'user@example.com' : 'username'}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                autoComplete={searchType === 'email' ? 'email' : 'username'}
              />
              <button type="submit" className="btn btn-primary btn-medium">
                Search
              </button>
              {hasActiveSearch && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </div>
          </form>

          {searchOwner && !loading && (
            <div className="explore-search-user-grid">
              <article className="profile-connection-card">
                <Link
                  to={`/profile/${searchOwner.userId}`}
                  className="profile-connection-card-profile"
                >
                  <ProfileAvatar
                    username={searchOwner.username}
                    profileImageUrl={searchOwner.profileImageUrl}
                    size="card"
                  />
                  <h4 className="profile-connection-card-username">{searchOwner.username}</h4>
                  {connectionStatus === 'connected' && searchOwner.email && (
                    <p className="profile-connection-card-email">{searchOwner.email}</p>
                  )}
                  {connectionStatus === 'pending_outgoing' && (
                    <p className="explore-user-connection-status">Request sent</p>
                  )}
                  {connectionStatus === 'pending_incoming' && (
                    <p className="explore-user-connection-status">Wants to connect</p>
                  )}
                  <p className="explore-user-layout-count">
                    {searchOwner.publishedLayoutCount} published layout
                    {searchOwner.publishedLayoutCount !== 1 ? 's' : ''}
                  </p>
                </Link>
                <div className="profile-connection-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => navigate(`/messages?user=${searchOwner.userId}`)}
                  >
                    Message
                  </button>
                  {renderConnectionAction(searchOwner.userId)}
                </div>
              </article>
            </div>
          )}

          {connectionError && <p className="error-message">{connectionError}</p>}

          {hasActiveSearch && !loading && !error && searchOwner && (
            <p className="explore-search-status">
              {layouts.length > 0 ?
                `Showing published layouts by ${searchOwner.username}.` :
                `${searchOwner.username} has no published layouts yet, but you can still connect.`}
            </p>
          )}

          {hasActiveSearch && !loading && !error && !searchOwner && (
            <p className="explore-search-status">No user found for {searchLabel}.</p>
          )}

          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p className="loading-state">Loading published layouts…</p>
          ) : layouts.length > 0 ? (
            <>
              <div className="layout-card-grid">
                {layouts.map((layout) => (
                  <article
                    key={layout._id || layout.layoutId}
                    className="layout-card"
                    onClick={() => navigate(`/layout/${layout._id || layout.layoutId}`)}
                  >
                    <LayoutThumbnail objects={layout.objects} />
                    <div className="layout-card-body">
                      <h3>{layout.name}</h3>
                      <p>{layout.description || 'No description'}</p>
                      <span className="layout-card-meta">
                        by{' '}
                        <Link
                          to={`/profile/${layout.userId}`}
                          className="explore-profile-link"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {layout.ownerUsername || 'Unknown'}
                        </Link>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="explore-pagination">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : !hasActiveSearch ? (
            <div className="empty-state">
              <p>{emptyMessage}</p>
            </div>
          ) : searchOwner ? null : (
            <div className="empty-state">
              <p>{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Explore;
