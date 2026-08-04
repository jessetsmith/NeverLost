import React from 'react';

function RouteLoadingFallback({ label = 'Loading…' }) {
    return (
        <div className="route-loading" role="status" aria-live="polite">
            <p className="loading-state">{label}</p>
        </div>
    );
}

export default RouteLoadingFallback;
