import React, { createContext, useState, useEffect, useCallback } from 'react';
import { clearSketchfabTokens } from '../utils/sketchfabAuth';

export const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [layouts, setLayouts] = useState([]);
    const [currentLayout, setCurrentLayout] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken) {
            setToken(storedToken);
        }
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('user');
            }
        }
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
            addObject,
            updateObject,
            removeObject,
            logoutUser,
        }}>
            {children}
        </LayoutContext.Provider>
    );
};
