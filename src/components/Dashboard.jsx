import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Add styling for the dashboard

import Menu from './Menu'

const API_URL = import.meta.env.VITE_APP_API_URL || '/api';

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
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // Ensure response.data is an array
                const layoutsData = Array.isArray(response.data) ? response.data : [];
                setLayouts(layoutsData);
            } catch (err) {
                console.error('Error fetching layouts:', err);
                setError(err.response?.data?.error || 'Failed to fetch layouts. Please try again.');
                setLayouts([]); // Ensure layouts is always an array
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
        setToken(null); // Clear the token from context
        navigate('/login'); // Redirect to login page
    };

    return (
        <div className="dashboard-container">
            <div className='nav-container'>
                <Menu />
                <button className="logout-button" onClick={handleLogout}>Logout</button>

            </div>
            <div className='content-container'>
                <h2>Your Layouts</h2>
                {error && <p className="error-message">{error}</p>}
                {loading ? (
                    <p>Loading layouts...</p>
                ) : (
                    <div className="layouts-list">
                        {layouts && Array.isArray(layouts) && layouts.length > 0 ? (
                            layouts.map((layout) => (
                                <div key={layout._id || layout.id} className="layout-item" onClick={() => handleLayoutClick(layout._id || layout.id)}>
                                    <h3>{layout.name}</h3>
                                    <p>{layout.description || 'No description'}</p>
                                </div>
                            ))
                        ) : (
                            <p>No layouts found. Create your first layout to get started!</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;