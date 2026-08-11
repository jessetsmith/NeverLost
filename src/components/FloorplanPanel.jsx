import React, { useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import { DEFAULT_LAYOUT_DIMENSIONS } from '../utils/layoutDimensions';
import './WallControls.css';

function FloorplanPanel({ dimensions, onChange, disabled = false }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const update = (patch) => {
        onChange({ ...dimensions, ...patch });
    };

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = getAuthToken();
            const response = await axios.post(`${API_URL}/assets/upload-floorplan`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            update({
                floorplanUrl: response.data.url || '',
                floorplanVisible: true,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload floorplan.');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleRemove = () => {
        update({
            floorplanUrl: '',
            floorplanVisible: DEFAULT_LAYOUT_DIMENSIONS.floorplanVisible,
            floorplanOpacity: DEFAULT_LAYOUT_DIMENSIONS.floorplanOpacity,
            floorplanRotation: DEFAULT_LAYOUT_DIMENSIONS.floorplanRotation,
            floorplanOffsetX: DEFAULT_LAYOUT_DIMENSIONS.floorplanOffsetX,
            floorplanOffsetZ: DEFAULT_LAYOUT_DIMENSIONS.floorplanOffsetZ,
        });
    };

    const hasFloorplan = Boolean(dimensions.floorplanUrl?.trim());
    const isVisible = dimensions.floorplanVisible !== false;

    return (
        <div className={`floorplan-panel${hasFloorplan && !isVisible ? ' is-hidden' : ''}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleUpload}
            />
            {!hasFloorplan ? (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                    disabled={disabled || uploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? 'Uploading…' : 'Upload Floorplan'}
                </button>
            ) : (
                <>
                    <div className="floorplan-header">
                        <div className="floorplan-header-copy">
                            <div className="floorplan-status">
                                {isVisible ? 'Floorplan visible' : 'Floorplan hidden'}
                            </div>
                            <p className="floorplan-header-hint">
                                {isVisible
                                    ? 'Shown on the room floor in the editor and layout view.'
                                    : 'Kept in this layout but not shown in the scene.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isVisible}
                            aria-label={isVisible ? 'Hide floorplan' : 'Show floorplan'}
                            className={`wall-toggle${isVisible ? ' is-on' : ''}`}
                            disabled={disabled}
                            onClick={() => update({ floorplanVisible: !isVisible })}
                        >
                            <span className="wall-toggle-track">
                                <span className="wall-toggle-thumb" />
                            </span>
                        </button>
                    </div>
                    <div className="form-group">
                        <label htmlFor="floorplan-opacity">
                            Opacity — {Math.round(dimensions.floorplanOpacity * 100)}%
                        </label>
                        <input
                            id="floorplan-opacity"
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={dimensions.floorplanOpacity}
                            onInput={(e) => update({ floorplanOpacity: parseFloat(e.target.value) })}
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="floorplan-rotation">
                            Rotation — {dimensions.floorplanRotation.toFixed(0)}°
                        </label>
                        <input
                            id="floorplan-rotation"
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={dimensions.floorplanRotation}
                            onInput={(e) => update({ floorplanRotation: parseFloat(e.target.value) })}
                            disabled={disabled}
                        />
                    </div>
                    <div className="layout-dimensions-row">
                        <div className="form-group">
                            <label htmlFor="floorplan-offset-x">Offset X</label>
                            <input
                                id="floorplan-offset-x"
                                type="number"
                                step="0.5"
                                value={dimensions.floorplanOffsetX}
                                onChange={(e) => update({ floorplanOffsetX: parseFloat(e.target.value) || 0 })}
                                disabled={disabled}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="floorplan-offset-z">Offset Z</label>
                            <input
                                id="floorplan-offset-z"
                                type="number"
                                step="0.5"
                                value={dimensions.floorplanOffsetZ}
                                onChange={(e) => update({ floorplanOffsetZ: parseFloat(e.target.value) || 0 })}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                    <div className="floorplan-actions">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={disabled || uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={disabled}
                            onClick={handleRemove}
                        >
                            Remove
                        </button>
                    </div>
                </>
            )}
            {error && <p className="asset-error">{error}</p>}
            <p className="layout-dimensions-hint">
                PNG, JPG, or WebP. Image stretches to match room width and depth.
            </p>
        </div>
    );
}

export default FloorplanPanel;
