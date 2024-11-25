import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Add styling for the dashboard

import Menu from './Menu'

const API_URL = import.meta.env.VITE_APP_API_URL;

function Dashboard() {
    const [layouts, setLayouts] = useState([]);
    const [error, setError] = useState('');
    const { token, setToken } = useContext(LayoutContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLayouts = async () => {
            try {
                const response = await axios.get(`${API_URL}/layouts`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setLayouts(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch layouts. Please try again.');
            }
        };

        fetchLayouts();
    }, [token]);

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
                <div className="layouts-list">
                    {layouts.map((layout) => (
                        <div key={layout._id} className="layout-item" onClick={() => handleLayoutClick(layout._id)}>
                            <h3>{layout.name}</h3>
                            <p>{layout.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;