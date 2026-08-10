import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
    clearAuthSession,
    loadAuthSession,
    saveAuthSession,
} from '../utils/authSession';

export const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [layouts, setLayouts] = useState([]);
    const [currentLayout, setCurrentLayout] = useState(null);
    const [selectedObject, setSelectedObject] = useState(null);
    const [user, setUser] = useState(() => loadAuthSession()?.user ?? null);
    const [token, setToken] = useState(() => loadAuthSession()?.token ?? null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            const storedSession = loadAuthSession();

            if (!storedSession?.token) {
                if (!cancelled) {
                    setAuthReady(true);
                }
                return;
            }

            if (!cancelled) {
                setToken(storedSession.token);
                setUser(storedSession.user ?? null);
            }

            try {
                const response = await axios.post(
                    `${API_URL}/users/session/refresh`,
                    {},
                    { headers: { Authorization: `Bearer ${storedSession.token}` } },
                );

                if (!cancelled) {
                    saveAuthSession({
                        token: response.data.token,
                        user: response.data.user,
                    });
                    setToken(response.data.token);
                    setUser(response.data.user);
                }
            } catch (err) {
                if (!cancelled) {
                    const status = err.response?.status;
                    if (status === 401 || status === 403) {
                        setToken(null);
                        setUser(null);
                        clearAuthSession();
                    } else if (status === 404 || status === 503) {
                        saveAuthSession({
                            token: storedSession.token,
                            user: storedSession.user ?? null,
                        });
                    } else if (!loadAuthSession()) {
                        setToken(null);
                        setUser(null);
                        clearAuthSession();
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
        setUser(null);
        setToken(null);
        clearAuthSession();
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
