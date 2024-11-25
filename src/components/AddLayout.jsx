import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';

function AddLayout() {
    const [name, setName] = useState('');
    const { addObject } = useContext(LayoutContext);
    const token = localStorage.getItem('token');

    const handleAddObject = () => {
        const newObject = {
            id: Date.now().toString(),
            type: 'box', // Default type, can be made selectable
            color: '#00ff00',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        };
        addObject(newObject);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('/api/layouts', { name, objects: [] }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(response => {
                console.log('Layout created:', response.data);
                // Optionally, redirect or update layouts list
            })
            .catch(error => {
                console.error('Error creating layout:', error);
            });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Layout Name"
                required
            />
            <button type="button" onClick={handleAddObject}>Add Object</button>
            {/* Additional UI for configuring objects can be added here */}
            <button type="submit">Add Layout</button>
        </form>
    );
}

export default AddLayout;