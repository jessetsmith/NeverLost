import React, { useEffect } from 'react';
import './LibrarySaveToast.css';

function LibrarySaveToast({ message, onViewAssets, onDismiss, autoDismissMs = 8000 }) {
    useEffect(() => {
        if (!autoDismissMs) return undefined;

        const timer = window.setTimeout(() => {
            onDismiss?.();
        }, autoDismissMs);

        return () => window.clearTimeout(timer);
    }, [autoDismissMs, message, onDismiss]);

    return (
        <div className="library-save-toast" role="status" aria-live="polite">
            <button
                type="button"
                className="library-save-toast-body"
                onClick={onViewAssets}
            >
                <span className="library-save-toast-message">{message}</span>
                <span className="library-save-toast-action">View in My Assets</span>
            </button>
            <button
                type="button"
                className="library-save-toast-close"
                aria-label="Dismiss"
                onClick={onDismiss}
            >
                ×
            </button>
        </div>
    );
}

export default LibrarySaveToast;
