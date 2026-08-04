import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import { LayoutContext } from '../context/LayoutContext';
import { API_URL } from '../config/api';
import {
    clearSketchfabTokens,
    getSketchfabRedirectUri,
    isSketchfabConnected,
    setPendingSketchfabAction,
} from '../utils/sketchfabAuth';
import './AccountPages.css';

function Settings() {
    const navigate = useNavigate();
    const { user, token, setUser, logoutUser } = useContext(LayoutContext);
    const [username, setUsername] = useState(user?.username || '');
    const [title, setTitle] = useState(user?.title || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const profileImageInputRef = useRef(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sketchfabConnected, setSketchfabConnected] = useState(isSketchfabConnected());
    const [serviceStatus, setServiceStatus] = useState({
        searchConfigured: false,
        oauthConfigured: false,
    });
    const [connectingSketchfab, setConnectingSketchfab] = useState(false);

    const authHeaders = useCallback(() => ({
        Authorization: `Bearer ${token}`,
    }), [token]);

    useEffect(() => {
        if (!token) return undefined;

        let cancelled = false;

        const loadProfile = async () => {
            try {
                const response = await axios.get(`${API_URL}/users/profile`, {
                    headers: authHeaders(),
                });
                if (!cancelled) {
                    const profile = response.data.user;
                    setUsername(profile.username || '');
                    setTitle(profile.title || '');
                    setBio(profile.bio || '');
                    setProfileImageUrl(profile.profileImageUrl || '');
                    setUser(profile);
                }
            } catch {
                // Keep values from context if profile fetch fails.
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [token, authHeaders, setUser]);

    useEffect(() => {
        if (user?.username) {
            setUsername(user.username);
        }
        if (user?.title !== undefined) {
            setTitle(user.title || '');
        }
        if (user?.bio !== undefined) {
            setBio(user.bio || '');
        }
        if (user?.profileImageUrl !== undefined) {
            setProfileImageUrl(user.profileImageUrl || '');
        }
    }, [user?.username, user?.title, user?.bio, user?.profileImageUrl]);

    useEffect(() => {
        if (!token) return undefined;

        let cancelled = false;

        const loadStatus = async () => {
            try {
                const response = await axios.get(`${API_URL}/sketchfab/status`, {
                    headers: authHeaders(),
                });
                if (!cancelled) {
                    setServiceStatus(response.data);
                }
            } catch {
                if (!cancelled) {
                    setServiceStatus({ searchConfigured: false, oauthConfigured: false });
                }
            }
        };

        loadStatus();
        setSketchfabConnected(isSketchfabConnected());

        return () => {
            cancelled = true;
        };
    }, [token, authHeaders]);

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }

        if (
            trimmedUsername === user?.username &&
            title.trim() === (user?.title || '') &&
            bio.trim() === (user?.bio || '') &&
            profileImageUrl.trim() === (user?.profileImageUrl || '')
        ) {
            setSuccess('Profile is already up to date.');
            return;
        }

        setSavingProfile(true);

        try {
            const response = await axios.put(
                `${API_URL}/users/profile`,
                {
                    username: trimmedUsername,
                    title: title.trim(),
                    bio: bio.trim(),
                    profileImageUrl: profileImageUrl.trim(),
                },
                { headers: authHeaders() },
            );

            setUser(response.data.user);
            setSuccess('Profile updated successfully.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update username.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleProfileImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setSuccess('');
        setUploadingProfileImage(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`${API_URL}/users/profile/avatar`, formData, {
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            });

            setProfileImageUrl(response.data.profileImageUrl || response.data.user?.profileImageUrl || '');
            if (response.data.user) {
                setUser(response.data.user);
            }
            setSuccess('Profile image uploaded successfully.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload profile image.');
        } finally {
            setUploadingProfileImage(false);
            event.target.value = '';
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }

        setChangingPassword(true);

        try {
            await axios.put(
                `${API_URL}/users/password`,
                {
                    currentPassword,
                    newPassword,
                },
                { headers: authHeaders() },
            );

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess('Password updated successfully.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password.');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleConnectSketchfab = async () => {
        setError('');
        setConnectingSketchfab(true);

        try {
            setPendingSketchfabAction({ type: 'connect', returnTo: '/settings' });
            const redirectUri = getSketchfabRedirectUri();
            const response = await axios.get(`${API_URL}/sketchfab/oauth/url`, {
                headers: authHeaders(),
                params: { redirectUri },
            });
            window.location.href = response.data.url;
        } catch (err) {
            setError(err.response?.data?.error || 'Could not start Sketchfab sign-in.');
            setConnectingSketchfab(false);
        }
    };

    const handleDisconnectSketchfab = () => {
        clearSketchfabTokens();
        setSketchfabConnected(false);
        setSuccess('Sketchfab disconnected from this browser.');
    };

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    return (
        <div className="app-shell account-page">
            <Menu />
            <div className="app-main">
                <header className="page-header account-header">
                    <h2>Account <span>Settings</span></h2>
                    <div className="toolbar-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                </header>

                <div className="account-content">
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <section className="account-panel">
                        <h3>Profile</h3>
                        <p className="account-panel-description">
                            Customize how other creators see you on NeverLost.
                        </p>

                        <div className="profile-settings-preview">
                            <ProfileAvatar
                                username={username}
                                profileImageUrl={profileImageUrl}
                                size="md"
                            />
                            {user?.id && (
                                <Link to={`/profile/${user.id}`} className="btn btn-ghost btn-sm">
                                    View public profile
                                </Link>
                            )}
                        </div>

                        <form className="account-form" onSubmit={handleProfileSubmit}>
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    minLength={3}
                                    maxLength={30}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={80}
                                    placeholder="3D designer, architect, hobbyist…"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={500}
                                    placeholder="Tell others a little about your work."
                                />
                            </div>
                            <div className="form-group">
                                <label>Profile image</label>
                                <p className="account-panel-description profile-image-help">
                                    Upload an image or paste a URL below.
                                </p>
                                <input
                                    ref={profileImageInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    hidden
                                    onChange={handleProfileImageUpload}
                                />
                                <div className="profile-image-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        disabled={uploadingProfileImage}
                                        onClick={() => profileImageInputRef.current?.click()}
                                    >
                                        {uploadingProfileImage ? 'Uploading…' : 'Upload image'}
                                    </button>
                                    {profileImageUrl && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setProfileImageUrl('')}
                                        >
                                            Clear image
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="profileImageUrl">Profile image URL</label>
                                <input
                                    id="profileImageUrl"
                                    type="url"
                                    value={profileImageUrl}
                                    onChange={(e) => setProfileImageUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                />
                            </div>
                            <div className="account-readonly-grid">
                                <div className="account-readonly-item">
                                    <label>Email</label>
                                    <p>{user?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="account-form-actions">
                                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                                    {savingProfile ? 'Saving…' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="account-panel">
                        <h3>Account</h3>
                        <p className="account-panel-description">
                            Account credentials and sign-in details.
                        </p>
                        <div className="account-readonly-grid">
                            <div className="account-readonly-item">
                                <label>Username</label>
                                <p>{user?.username || '—'}</p>
                            </div>
                            <div className="account-readonly-item">
                                <label>Email</label>
                                <p>{user?.email || '—'}</p>
                            </div>
                        </div>
                    </section>

                    <section className="account-panel">
                        <h3>Password</h3>
                        <p className="account-panel-description">
                            Choose a strong password with at least 8 characters.
                        </p>

                        <form className="account-form" onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current password</label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newPassword">New password</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm new password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="account-form-actions">
                                <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                                    {changingPassword ? 'Updating…' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="account-panel">
                        <h3>Integrations</h3>
                        <p className="account-panel-description">
                            Connect Sketchfab to download models into your library and layouts.
                        </p>

                        <div className="account-status-row">
                            <div>
                                <span className="account-status-label">Sketchfab</span>
                                <span className="account-status-detail">
                                    {serviceStatus.oauthConfigured
                                        ? 'OAuth is configured on the server.'
                                        : 'OAuth is not configured on the server yet.'}
                                </span>
                                {!serviceStatus.searchConfigured && (
                                    <span className="account-status-detail">
                                        Search requires SKETCHFAB_API_TOKEN on the server.
                                    </span>
                                )}
                            </div>
                            <span className={`account-status-badge ${sketchfabConnected ? 'connected' : 'disconnected'}`}>
                                {sketchfabConnected ? 'Connected' : 'Not connected'}
                            </span>
                        </div>

                        <div className="account-form-actions">
                            {sketchfabConnected ? (
                                <button type="button" className="btn btn-secondary" onClick={handleDisconnectSketchfab}>
                                    Disconnect Sketchfab
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleConnectSketchfab}
                                    disabled={!serviceStatus.oauthConfigured || connectingSketchfab}
                                >
                                    {connectingSketchfab ? 'Redirecting…' : 'Connect Sketchfab'}
                                </button>
                            )}
                            <Link to="/library" className="btn btn-ghost btn-sm">
                                Open Library
                            </Link>
                        </div>

                        <p className="account-link-row">
                            Sketchfab sign-in returns through the Library page. Browse models there after connecting.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Settings;
