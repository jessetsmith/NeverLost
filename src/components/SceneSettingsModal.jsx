import React, { useEffect } from 'react';
import SceneSettingsPanel from './SceneSettingsPanel';
import './Social.css';
import './SceneSettingsModal.css';

function SceneSettingsModal({ isOpen, settings, onChange, onClose }) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay scene-settings-modal-overlay"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="modal-card scene-settings-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="scene-settings-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="scene-settings-title">Scene</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <SceneSettingsPanel settings={settings} onChange={onChange} />
            </div>
        </div>
    );
}

export default SceneSettingsModal;
