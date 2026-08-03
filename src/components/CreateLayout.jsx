import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import Menu from './Menu';
import { API_URL } from '../config/api';
import { v4 as uuidv4 } from 'uuid';
import './CreateLayout.css';

function CreateLayout() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useContext(LayoutContext);
    const navigate = useNavigate();

    const getDefaultObjects = () => [
        {
            id: uuidv4(),
            type: 'cube',
            color: '#00f5d4',
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setError('You must be logged in to create a layout.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/layouts`, {
                name,
                description,
                objects: getDefaultObjects(),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { layoutId } = response.data;
            if (layoutId) {
                navigate(`/layout/${layoutId}`);
            } else {
                setError('Layout created but no ID returned. Please try again.');
            }
        } catch (err) {
            console.error('Create layout error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to create layout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-shell create-layout-page">
            <Menu />
            <div className="app-main create-layout-main">
                <form onSubmit={handleSubmit} className="auth-card create-layout-card">
                    <h2>New Layout</h2>
                    <p className="auth-subtitle">Give your space a name and description</p>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="name">Layout Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="My Room, Warehouse Floor…"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            placeholder="What's this layout for?"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating…' : 'Create Layout'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateLayout;
