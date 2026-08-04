import React, { useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import LayoutThumbnail from './LayoutThumbnail';
import { LayoutContext } from '../context/LayoutContext';
import { API_URL } from '../config/api';
import './AccountPages.css';
import './Profile.css';

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, token, logoutUser } = useContext(LayoutContext);
  const [profile, setProfile] = useState(null);
  const [publishedLayouts, setPublishedLayouts] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

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

  const handleAcceptConnection = async () => {
    if (!pendingRequestId) return;

    setConnectionLoading(true);
    try {
      await axios.post(`${API_URL}/connections/requests/${pendingRequestId}/accept`, {}, { headers: authHeaders() });
      setConnectionStatus('connected');
      setPendingRequestId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleDeclineConnection = async () => {
    if (!pendingRequestId) return;

    setConnectionLoading(true);
    try {
      await axios.post(`${API_URL}/connections/requests/${pendingRequestId}/decline`, {}, { headers: authHeaders() });
      setConnectionStatus('none');
      setPendingRequestId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleRemoveConnection = async () => {
    setConnectionLoading(true);
    try {
      await axios.delete(`${API_URL}/connections/${userId}`, { headers: authHeaders() });
      setConnectionStatus('none');
      setPendingRequestId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove connection.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const isViewerOwnProfile = isOwnProfile || currentUser?.id === userId;

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
          {loading ? (
            <p className="loading-state">Loading profile…</p>
          ) : profile ? (
            <>
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
                              onClick={handleRemoveConnection}
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
                              onClick={handleRemoveConnection}
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
                              onClick={handleAcceptConnection}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={connectionLoading}
                              onClick={handleDeclineConnection}
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

              <section className="account-panel">
                <h3>Published layouts</h3>
                {publishedLayouts.length > 0 ? (
                  <div className="layout-card-grid profile-layout-grid">
                    {publishedLayouts.map((layout) => (
                      <article
                        key={layout._id}
                        className="layout-card"
                        onClick={() => navigate(`/layout/${layout._id}`)}
                      >
                        <LayoutThumbnail objects={layout.objects} />
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
            </>
          ) : (
            <p className="error-message">Profile not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
