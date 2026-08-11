import React, { useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import LayoutThumbnail from './LayoutThumbnail';
import { LayoutContext } from '../context/LayoutContext';
import { API_URL } from '../config/api';
import './AccountPages.css';
import './LayoutCard.css';
import './Profile.css';

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, token, logoutUser } = useContext(LayoutContext);
  const [profile, setProfile] = useState(null);
  const [publishedLayouts, setPublishedLayouts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

  const isViewerOwnProfile = isOwnProfile || currentUser?.id === userId;

  const fetchConnections = useCallback(async () => {
    if (!token || !isViewerOwnProfile) {
      setConnections([]);
      setIncomingRequests([]);
      return;
    }

    setConnectionsLoading(true);
    try {
      const [connectionsResponse, requestsResponse] = await Promise.all([
        axios.get(`${API_URL}/connections`, { headers: authHeaders() }),
        axios.get(`${API_URL}/connections/requests`, { headers: authHeaders() }),
      ]);
      setConnections(connectionsResponse.data.connections || []);
      setIncomingRequests(requestsResponse.data.requests || []);
      setConnectionError('');
    } catch (err) {
      console.error('Error fetching connections:', err);
      setConnectionError(err.response?.data?.error || 'Failed to load connections.');
    } finally {
      setConnectionsLoading(false);
    }
  }, [authHeaders, isViewerOwnProfile, token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_URL}/users/${userId}/public`, {
          headers: authHeaders(),
        });
        setProfile(response.data.profile);
        setPublishedLayouts(response.data.publishedLayouts || []);
        setIsOwnProfile(Boolean(response.data.isOwnProfile));
        setConnectionStatus(response.data.connectionStatus || (response.data.isConnected ? 'connected' : 'none'));
        setPendingRequestId(response.data.pendingRequestId || null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.error || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    if (userId && token) {
      fetchProfile();
    }
  }, [userId, token, authHeaders]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAddConnection = async () => {
    setConnectionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/connections`, { userId }, { headers: authHeaders() });
      setConnectionStatus(response.data.connectionStatus || 'pending_outgoing');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleAcceptConnection = async (requestId = pendingRequestId) => {
    if (!requestId) return;

    setConnectionLoading(true);
    setConnectionError('');
    try {
      await axios.post(`${API_URL}/connections/requests/${requestId}/accept`, {}, { headers: authHeaders() });
      if (requestId === pendingRequestId) {
        setConnectionStatus('connected');
        setPendingRequestId(null);
      }
      await fetchConnections();
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to accept connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleDeclineConnection = async (requestId = pendingRequestId) => {
    if (!requestId) return;

    setConnectionLoading(true);
    setConnectionError('');
    try {
      await axios.post(`${API_URL}/connections/requests/${requestId}/decline`, {}, { headers: authHeaders() });
      if (requestId === pendingRequestId) {
        setConnectionStatus('none');
        setPendingRequestId(null);
      }
      await fetchConnections();
    } catch (err) {
      setConnectionError(err.response?.data?.error || 'Failed to decline connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleRemoveConnection = async (targetUserId = userId) => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      await axios.delete(`${API_URL}/connections/${targetUserId}`, { headers: authHeaders() });
      if (targetUserId === userId) {
        setConnectionStatus('none');
        setPendingRequestId(null);
      }
      await fetchConnections();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to remove connection.';
      if (targetUserId === userId) {
        setError(message);
      } else {
        setConnectionError(message);
      }
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const normalizedConnectionSearch = connectionSearch.trim().toLowerCase();
  const filteredConnections = connections.filter((connection) => {
    if (!normalizedConnectionSearch) {
      return true;
    }
    return (
      connection.username?.toLowerCase().includes(normalizedConnectionSearch) ||
      connection.email?.toLowerCase().includes(normalizedConnectionSearch)
    );
  });

  return (
    <div className="app-shell profile-page">
      <Menu />
      <div className="app-main">
        <header className="page-header account-header">
          <h2>Creator <span>Profile</span></h2>
          {isViewerOwnProfile && (
            <div className="toolbar-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </header>

        <div className="account-content profile-content">
          {error && <p className="error-message">{error}</p>}
          {connectionError && isViewerOwnProfile && <p className="error-message">{connectionError}</p>}
          {loading ? (
            <p className="loading-state">Loading profile…</p>
          ) : profile ? (
            <div className="profile-columns">
              <div className="profile-column profile-column-left">
              <section className="profile-hero account-panel">
                <ProfileAvatar
                  username={profile.username}
                  profileImageUrl={profile.profileImageUrl}
                  size="lg"
                />
                <div className="profile-hero-body">
                  <h3>{profile.username}</h3>
                  {profile.title && <p className="profile-title">{profile.title}</p>}
                  {profile.bio ? (
                    <p className="profile-bio">{profile.bio}</p>
                  ) : (
                    <p className="profile-bio profile-bio-empty">No bio yet.</p>
                  )}
                  <div className="profile-actions">
                    {isOwnProfile ? (
                      <Link to="/settings" className="btn btn-primary btn-sm">
                        Edit profile
                      </Link>
                    ) : (
                      <>
                        {connectionStatus === 'connected' && (
                          <>
                            <span className="connection-badge">Connected</span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={connectionLoading}
                              onClick={() => handleRemoveConnection()}
                            >
                              Remove connection
                            </button>
                          </>
                        )}
                        {connectionStatus === 'pending_outgoing' && (
                          <>
                            <span className="connection-badge connection-badge-pending">Request sent</span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={connectionLoading}
                              onClick={() => handleRemoveConnection()}
                            >
                              Cancel request
                            </button>
                          </>
                        )}
                        {connectionStatus === 'pending_incoming' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={connectionLoading}
                              onClick={() => handleAcceptConnection()}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={connectionLoading}
                              onClick={() => handleDeclineConnection()}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {connectionStatus === 'none' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={connectionLoading}
                            onClick={handleAddConnection}
                          >
                            Add connection
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/messages?user=${userId}`)}
                        >
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {isViewerOwnProfile && (
                <>
                  {incomingRequests.length > 0 && (
                    <section className="account-panel profile-connections-section">
                      <h3>Connection requests</h3>
                      <ul className="profile-connections-list">
                        {incomingRequests.map((request) => (
                          <li key={request.id} className="profile-connection-item">
                            <Link to={`/profile/${request.userId}`} className="profile-connection-name">
                              {request.username}
                            </Link>
                            <div className="profile-connection-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-xs"
                                disabled={connectionLoading}
                                onClick={() => handleAcceptConnection(request.id)}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                disabled={connectionLoading}
                                onClick={() => handleDeclineConnection(request.id)}
                              >
                                Decline
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="account-panel profile-connections-section">
                    <div className="profile-connections-header">
                      <h3>Your connections</h3>
                      {connections.length > 0 && (
                        <div className="profile-connections-search">
                          <label htmlFor="connection-search" className="visually-hidden">
                            Search connections
                          </label>
                          <input
                            id="connection-search"
                            type="search"
                            value={connectionSearch}
                            onChange={(event) => setConnectionSearch(event.target.value)}
                            placeholder="Search by name or email…"
                            autoComplete="off"
                          />
                          {connectionSearch && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => setConnectionSearch('')}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {connectionsLoading ? (
                      <p className="loading-state">Loading connections…</p>
                    ) : connections.length === 0 ? (
                      <p className="text-muted">
                        Search for creators on Explore to send your first connection request.
                      </p>
                    ) : filteredConnections.length === 0 ? (
                      <p className="text-muted">No connections match &ldquo;{connectionSearch.trim()}&rdquo;.</p>
                    ) : (
                      <div className="profile-connections-grid">
                        {filteredConnections.map((connection) => (
                          <article key={connection.userId} className="profile-connection-card">
                            <Link
                              to={`/profile/${connection.userId}`}
                              className="profile-connection-card-profile"
                            >
                              <ProfileAvatar
                                username={connection.username}
                                profileImageUrl={connection.profileImageUrl}
                                size="card"
                              />
                              <h4 className="profile-connection-card-username">{connection.username}</h4>
                              {connection.email && (
                                <p className="profile-connection-card-email">{connection.email}</p>
                              )}
                            </Link>
                            <div className="profile-connection-card-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => navigate(`/messages?user=${connection.userId}`)}
                              >
                                Message
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                disabled={connectionLoading}
                                onClick={() => handleRemoveConnection(connection.userId)}
                              >
                                Remove
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
              </div>

              <div className="profile-column profile-column-right">
              <section className="account-panel profile-layouts-section">
                <h3>Published layouts</h3>
                {publishedLayouts.length > 0 ? (
                  <div className="layout-card-grid profile-layout-grid scroll-panel">
                    {publishedLayouts.map((layout) => (
                      <article
                        key={layout._id}
                        className="layout-card"
                        onClick={() => navigate(`/layout/${layout._id}`)}
                      >
                        <LayoutThumbnail
                            objects={layout.objects}
                            sceneSettings={layout.sceneSettings}
                            layoutDimensions={layout.layoutDimensions}
                            thumbnailUrl={layout.thumbnailUrl}
                            thumbnailUpdatedAt={layout.thumbnailUpdatedAt}
                            layoutUpdatedAt={layout.layoutUpdatedAt}
                        />
                        <div className="layout-card-body">
                          <h3>{layout.name}</h3>
                          <p>{layout.description || 'No description'}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No published layouts yet.</p>
                )}
              </section>
              </div>
            </div>
          ) : (
            <p className="error-message">Profile not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
