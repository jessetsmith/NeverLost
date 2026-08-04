import React, { useEffect, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { API_URL } from '../config/api';
import { parseLayoutsResponse } from '../utils/layoutList';

function LayoutManager() {
    const { layouts, setLayouts, setCurrentLayout } = useContext(LayoutContext);
    const token = localStorage.getItem('token');

    useEffect(() => {
        axios.get(`${API_URL}/layouts`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(response => {
                const { owned, shared } = parseLayoutsResponse(response.data);
                setLayouts([...owned, ...shared]);
            })
            .catch(error => {
                console.error('Error fetching layouts:', error);
            });
    }, [setLayouts, token]);

    const selectLayout = (layout) => {
        setCurrentLayout(layout);
    };

    const deleteLayout = (id) => {
        axios.delete(`${API_URL}/layouts/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(() => {
                setLayouts(prev => prev.filter(layout => layout._id !== id));
                if (id === currentLayout?._id) setCurrentLayout(null);
            })
            .catch(error => {
                console.error('Error deleting layout:', error);
            });
    };

    return (
        <div>
            <h2>Available Layouts</h2>
            <ul>
                {layouts.map(layout => (
                    <li key={layout._id}>
                        <span onClick={() => selectLayout(layout)}>{layout.name}</span>
                        <button onClick={() => deleteLayout(layout._id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default LayoutManager;