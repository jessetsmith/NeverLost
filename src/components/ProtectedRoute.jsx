import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutContext } from '../context/LayoutContext';
import RouteLoadingFallback from './RouteLoadingFallback';

function ProtectedRoute({ children }) {
    const { user, authReady } = useContext(LayoutContext);

    if (!authReady) {
        return <RouteLoadingFallback label="Restoring session…" />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
