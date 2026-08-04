import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import Menu from './Menu';
import LayoutThumbnail from './LayoutThumbnail';
import { API_URL } from '../config/api';
import { parseLayoutsResponse } from '../utils/layoutList';
import './Home.css';
import './Social.css';

function LayoutCard({ layout, badge, onClick }) {
    return (
        <article
            className="layout-card"
            onClick={onClick}
        >
            <LayoutThumbnail objects={layout.objects} />
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

function Home() {
    const [ownedLayouts, setOwnedLayouts] = useState([]);
    const [sharedLayouts, setSharedLayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, logoutUser } = useContext(LayoutContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchLayouts = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axios.get(`${API_URL}/layouts`, {
                    headers: { Authorization: `Bearer ${token}` },
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
                setLoading(false);
            }
        };

        fetchLayouts();
    }, [token, navigate]);

    const handleLayoutClick = (layoutId) => {
        navigate(`/layout/${layoutId}`);
    };

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    const hasAnyLayouts = ownedLayouts.length > 0 || sharedLayouts.length > 0;

    return (
        <div className="app-shell home-container">
            <Menu />
            <div className="app-main">
                <header className="page-header home-header">
                    <h2>Your <span>Layouts</span></h2>
                    <div className="toolbar-actions">
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
                    {loading ? (
                        <p className="loading-state">Loading layouts…</p>
                    ) : hasAnyLayouts ? (
                        <>
                            {ownedLayouts.length > 0 && (
                                <section className="home-section">
                                    <div className="layout-card-grid">
                                        {ownedLayouts.map((layout) => (
                                            <LayoutCard
                                                key={layout._id || layout.layoutId}
                                                layout={layout}
                                                onClick={() => handleLayoutClick(layout._id || layout.layoutId)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {sharedLayouts.length > 0 && (
                                <section className="home-section">
                                    <h3>Shared with me</h3>
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
                                </section>
                            )}
                        </>
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
                </div>
            </div>
        </div>
    );
}

export default Home;
