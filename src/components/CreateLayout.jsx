import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import './CreateLayout.css'; // Styling for the create layout form
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const API_URL = import.meta.env.VITE_APP_API_URL;

function CreateLayout() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const { token } = useContext(LayoutContext);
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
            navigate(`/layout/${layoutId}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create layout. Please try again.');
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
                <button type="submit" className="submit-button">Create Layout</button>
            </form>
        </div>
    );
}

export default CreateLayout;