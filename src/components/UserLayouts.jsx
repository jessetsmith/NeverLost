import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import './UserLayouts.css'; // Styling for the user layouts

function UserLayouts() {
    const { user, token } = useContext(LayoutContext);
    const [layouts, setLayouts] = useState([]);

    useEffect(() => {
        const fetchLayouts = async () => {
            try {
                const response = await axios.get('/api/layouts', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setLayouts(response.data);
            } catch (err) {
                console.error('Error fetching layouts:', err);
            }
        };

        if (user) {
            fetchLayouts();
        }
    }, [user, token]);

    return (
        <div className="user-layouts">
            <h2>Your Layouts</h2>
            {layouts.length > 0 ? (
                <ul>
                    {layouts.map(layout => (
                        <li key={layout._id}>
                            <h3>{layout.name}</h3>
                            <p>{layout.description}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No layouts found. Create your first layout!</p>
            )}
        </div>
    );
}

export default UserLayouts;