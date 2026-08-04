import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import Menu from './Menu';
import LayoutThumbnail from './LayoutThumbnail';
import { API_URL } from '../config/api';
import './Dashboard.css';

function Dashboard() {
    const [layouts, setLayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, setToken } = useContext(LayoutContext);
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
                const layoutsData = Array.isArray(response.data) ? response.data : [];
                setLayouts(layoutsData);
            } catch (err) {
                console.error('Error fetching layouts:', err);
                setError(err.response?.data?.error || 'Failed to fetch layouts. Please try again.');
                setLayouts([]);
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
        setToken(null);
        navigate('/login');
    };

    return (
        <div className="app-shell dashboard-container">
            <Menu />
            <div className="app-main">
                <header className="page-header dashboard-header">
                    <h2>Your <span>Layouts</span></h2>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
                </header>
                <div className="dashboard-content">
                    {error && <p className="error-message">{error}</p>}
                    {loading ? (
                        <p className="loading-state">Loading layouts…</p>
                    ) : layouts.length > 0 ? (
                        <div className="layout-card-grid">
                            {layouts.map((layout) => (
                                <article
                                    key={layout._id || layout.id}
                                    className="layout-card"
                                    onClick={() => handleLayoutClick(layout._id || layout.id)}
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
                        <div className="empty-state">
                            <p>No layouts yet. Create your first one to get started.</p>
                            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/create-layout')}>
                                Create Layout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
