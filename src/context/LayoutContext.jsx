import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { clearSketchfabTokens } from '../utils/sketchfabAuth';

export const LayoutContext = createContext();

function loadStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        localStorage.removeItem('user');
        return null;
    }
}

function clearStoredAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export const LayoutProvider = ({ children }) => {
    const [layouts, setLayouts] = useState([]);
    const [currentLayout, setCurrentLayout] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [user, setUser] = useState(() => loadStoredUser());
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            const storedToken = localStorage.getItem('token');

            if (!storedToken) {
                if (!cancelled) {
                    setAuthReady(true);
                }
                return;
            }

            try {
                const response = await axios.post(
                    `${API_URL}/users/session/refresh`,
                    {},
                    { headers: { Authorization: `Bearer ${storedToken}` } },
                );

                if (!cancelled) {
                    setToken(response.data.token);
                    setUser(response.data.user);
                }
            } catch (err) {
                if (!cancelled) {
                    const status = err.response?.status;
                    // Backward-compatible: keep stored session if refresh route is unavailable
                    if (status === 404 || status === 503) {
                        setToken(storedToken);
                        setUser(loadStoredUser());
                    } else {
                        clearSketchfabTokens();
                        setToken(null);
                        setUser(null);
                        clearStoredAuth();
                    }
                }
            } finally {
                if (!cancelled) {
                    setAuthReady(true);
                }
            }
        };

        restoreSession();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const addObject = (object) => {
        setCurrentLayout(prev => ({
            ...prev,
            objects: [...prev.objects, object],
        }));
    };

    const updateObject = (updatedObject) => {
        setCurrentLayout(prev => ({
            ...prev,
            objects: prev.objects.map(obj => obj.id === updatedObject.id ? { ...obj, ...updatedObject } : obj),
        }));
    };

    const removeObject = (id) => {
        setCurrentLayout(prev => ({
            ...prev,
            objects: prev.objects.filter(obj => obj.id !== id),
        }));
    };

    const logoutUser = useCallback(() => {
        clearSketchfabTokens();
        setUser(null);
        setToken(null);
        clearStoredAuth();
    }, []);

    return (
        <LayoutContext.Provider value={{
            layouts,
            setLayouts,
            currentLayout,
            setCurrentLayout,
            selectedObject,
            setSelectedObject,
            user,
            setUser,
            token,
            setToken,
            authReady,
            addObject,
            updateObject,
            removeObject,
            logoutUser,
        }}>
            {children}
        </LayoutContext.Provider>
    );
};
