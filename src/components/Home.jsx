import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { Link, useNavigate } from 'react-router-dom';
import Menu from './Menu';
import LayoutThumbnail from './LayoutThumbnail';
import ProfileAvatar from './ProfileAvatar';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import { parseLayoutsResponse } from '../utils/layoutList';
import './Home.css';
import './LayoutCard.css';
import './Social.css';

function LayoutCard({ layout, badge, onClick }) {
    return (
        <article
            className="layout-card"
            onClick={onClick}
        >
            <LayoutThumbnail
                objects={layout.objects}
                sceneSettings={layout.sceneSettings}
                layoutDimensions={layout.layoutDimensions}
            />
            <div className="layout-card-body">
                <h3>
                    {layout.name}
                    {badge && <span className="layout-shared-badge">{badge}</span>}
                </h3>
                <p>{layout.description || 'No description'}</p>
            </div>
        </article>
    );
}

function formatRelativeTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function getFeedHeadline(item) {
    if (item.type === 'layout_published') {
        return `published a layout`;
    }
    if (item.type === 'layout_shared') {
        return `shared a layout with you`;
    }
    if (item.type === 'forum_thread') {
        return `started a forum discussion`;
    }
    return 'shared an update';
}

function Home() {
    const [ownedLayouts, setOwnedLayouts] = useState([]);
    const [sharedLayouts, setSharedLayouts] = useState([]);
    const [feedItems, setFeedItems] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [layoutsLoading, setLayoutsLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, logoutUser } = useContext(LayoutContext);
    const navigate = useNavigate();

    const authHeaders = useCallback(() => ({
        Authorization: `Bearer ${getAuthToken() || token}`,
    }), [token]);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchLayouts = async () => {
            try {
                setLayoutsLoading(true);
                setError('');
                const response = await axios.get(`${API_URL}/layouts`, {
                    headers: authHeaders(),
                });
                const { owned, shared } = parseLayoutsResponse(response.data);
                setOwnedLayouts(owned);
                setSharedLayouts(shared);
            } catch (err) {
                console.error('Error fetching layouts:', err);
                setError(err.response?.data?.error || 'Failed to fetch layouts. Please try again.');
                setOwnedLayouts([]);
                setSharedLayouts([]);
            } finally {
                setLayoutsLoading(false);
            }
        };

        const fetchFeed = async () => {
            try {
                setFeedLoading(true);
                const response = await axios.get(`${API_URL}/feed`, {
                    headers: authHeaders(),
                    params: { page: 1, limit: 12 },
                });
                setFeedItems(response.data.items || []);
            } catch (err) {
                console.error('Error fetching feed:', err);
                setFeedItems([]);
            } finally {
                setFeedLoading(false);
            }
        };

        fetchLayouts();
        fetchFeed();
    }, [token, navigate, authHeaders]);

    const handleLayoutClick = (layoutId) => {
        navigate(`/layout/${layoutId}`);
    };

    const handleFeedClick = (item) => {
        if (item.type === 'forum_thread' && item.thread?.threadId) {
            navigate(`/forum/${item.thread.threadId}`);
            return;
        }
        if (item.layout?.layoutId) {
            navigate(`/layout/${item.layout.layoutId}`);
        }
    };

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    const hasAnyLayouts = ownedLayouts.length > 0 || sharedLayouts.length > 0;
    const loading = layoutsLoading && feedLoading;

    return (
        <div className="app-shell home-container">
            <Menu />
            <div className="app-main home-main">
                <header className="page-header home-header home-header-fixed">
                    <h2><span>Home</span></h2>
                    <div className="toolbar-actions">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate('/forum')}
                        >
                            Forum
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate('/create-layout')}
                        >
                            New Layout
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                </header>
                <div className="home-content">
                    {error && <p className="error-message">{error}</p>}

                    <div className="home-sections-row">
                    <section className="home-section home-feed-section">
                        <div className="home-section-header">
                            <h3>Connection <span>Updates</span></h3>
                            <p className="home-section-subtitle">
                                Published layouts, shares, and discussions from your connections.
                            </p>
                        </div>
                        {feedLoading ? (
                            <p className="loading-state">Loading updates…</p>
                        ) : feedItems.length === 0 ? (
                            <div className="home-feed-empty">
                                <p>No updates yet. Connect with creators on Explore to see their activity here.</p>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => navigate('/explore')}
                                >
                                    Find creators
                                </button>
                            </div>
                        ) : (
                            <div className="home-section-body scroll-auto-hide home-feed-list">
                                {feedItems.map((item) => (
                                    <article
                                        key={item.id}
                                        className="home-feed-item"
                                        onClick={() => handleFeedClick(item)}
                                    >
                                        <div className="home-feed-item-header">
                                            <Link
                                                to={`/profile/${item.actor.userId}`}
                                                className="home-feed-actor"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <ProfileAvatar
                                                    username={item.actor.username}
                                                    profileImageUrl={item.actor.profileImageUrl}
                                                    size="sm"
                                                />
                                                <div>
                                                    <strong>{item.actor.username}</strong>
                                                    <span>{getFeedHeadline(item)}</span>
                                                </div>
                                            </Link>
                                            <time className="home-feed-time">{formatRelativeTime(item.createdAt)}</time>
                                        </div>

                                        {item.layout && (
                                            <div className="home-feed-layout">
                                                <div className="home-feed-thumb">
                                                    <LayoutThumbnail
                                                        objects={item.layout.objects}
                                                        sceneSettings={item.layout.sceneSettings}
                                                        layoutDimensions={item.layout.layoutDimensions}
                                                    />
                                                </div>
                                                <div>
                                                    <h4>{item.layout.name}</h4>
                                                    <p>{item.layout.description || 'No description'}</p>
                                                    {item.type === 'layout_shared' && item.layout.role && (
                                                        <span className="layout-shared-badge">
                                                            {item.layout.role === 'viewer' ? 'View only' : 'Can edit'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {item.thread && (
                                            <div className="home-feed-thread">
                                                <h4>{item.thread.title}</h4>
                                                <p>{item.thread.body}</p>
                                                <span className="home-feed-thread-meta">
                                                    {item.thread.replyCount} {item.thread.replyCount === 1 ? 'reply' : 'replies'}
                                                </span>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="home-section">
                        <div className="home-section-header">
                            <h3>Your <span>Layouts</span></h3>
                        </div>
                        {loading ? (
                            <p className="loading-state">Loading layouts…</p>
                        ) : hasAnyLayouts ? (
                            <div className="home-section-body scroll-auto-hide">
                                {ownedLayouts.length > 0 && (
                                    <div className="layout-card-grid">
                                        {ownedLayouts.map((layout) => (
                                            <LayoutCard
                                                key={layout._id || layout.layoutId}
                                                layout={layout}
                                                onClick={() => handleLayoutClick(layout._id || layout.layoutId)}
                                            />
                                        ))}
                                    </div>
                                )}
                                {sharedLayouts.length > 0 && (
                                    <>
                                        <h4 className="home-subsection-title">Shared with me</h4>
                                        <div className="layout-card-grid">
                                            {sharedLayouts.map((layout) => (
                                                <LayoutCard
                                                    key={layout._id || layout.layoutId}
                                                    layout={layout}
                                                    badge={layout.role === 'viewer' ? 'View only' : 'Shared'}
                                                    onClick={() => handleLayoutClick(layout._id || layout.layoutId)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No layouts yet. Create your first one to get started.</p>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ marginTop: '1.5rem' }}
                                    onClick={() => navigate('/create-layout')}
                                >
                                    New Layout
                                </button>
                            </div>
                        )}
                    </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
