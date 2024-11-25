import React, { createContext, useState, useEffect } from 'react';

export const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [layouts, setLayouts] = useState([]);
    const [currentLayout, setCurrentLayout] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    // Load user and token from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken) {
            setToken(storedToken);
        }
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Update localStorage when user or token changes
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

    const logoutUser = () => {
        setUser(null);
        setToken(null);
    };

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