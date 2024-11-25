import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutContext } from '../context/LayoutContext';

function ProtectedRoute({ children }) {
    const { user } = useContext(LayoutContext);

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
}

export default ProtectedRoute;