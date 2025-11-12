import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import './CreateLayout.css'; // Styling for the create layout form
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const API_URL = import.meta.env.VITE_APP_API_URL || '/api';

function CreateLayout() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { token, user } = useContext(LayoutContext);
    const navigate = useNavigate();

    const getDefaultObjects = () => {
        return [
            {
                id: uuidv4(),
                type: 'cube',
                color: '#00ff00',
                position: { x: 0, y: 0.5, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
            },
        ];
    };

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
                objects: getDefaultObjects(), // Include default objects
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const { layoutId } = response.data;
            if (layoutId) {
                navigate(`/layout/${layoutId}`);
            } else {
                setError('Layout created but no ID returned. Please try again.');
            }
        } catch (err) {
            console.error('Create layout error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to create layout. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-layout-container">
            <form onSubmit={handleSubmit} className="create-layout-form">
                <h2>Create a New Layout</h2>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="name">Layout Name:</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Enter layout name"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        placeholder="Enter layout description"
                    />
                </div>
                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Layout'}
                </button>
            </form>
        </div>
    );
}

export default CreateLayout;