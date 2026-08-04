import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutContext } from '../context/LayoutContext';
import RouteLoadingFallback from './RouteLoadingFallback';

function ProtectedRoute({ children }) {
    const { user, token, authReady } = useContext(LayoutContext);

    if (!authReady) {
        return <RouteLoadingFallback label="Restoring session…" />;
    }

    if (!user && !token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
