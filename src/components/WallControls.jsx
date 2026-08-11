import React from 'react';
import './WallControls.css';

function WallControls({ dimensions, onChange, idPrefix = 'wall' }) {
    const update = (key, value) => {
        onChange({ ...dimensions, [key]: value });
    };

    const enabled = Boolean(dimensions.wallsEnabled);
    const unitLabel = dimensions.unit === 'm' ? 'm' : 'ft';

    return (
        <div className={`wall-controls-card${enabled ? ' is-enabled' : ''}`}>
            <div className="wall-controls-top">
                <div className="wall-controls-copy">
                    <div className="wall-controls-title-row">
                        <span className="wall-controls-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M4 20V8l8-4 8 4v12" />
                                <path d="M4 8h16" />
                                <path d="M12 4v16" />
                            </svg>
                        </span>
                        <h4 className="wall-controls-title" id={`${idPrefix}-label`}>
                            Edge Walls
                        </h4>
                    </div>
                    <p className="wall-controls-desc">
                        Place a wall on every edge of the room outline, up to ceiling height.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-labelledby={`${idPrefix}-label`}
                    className={`wall-toggle${enabled ? ' is-on' : ''}`}
                    onClick={() => update('wallsEnabled', !enabled)}
                >
                    <span className="wall-toggle-track">
                        <span className="wall-toggle-thumb" />
                    </span>
                    <span className="sr-only">{enabled ? 'Disable edge walls' : 'Enable edge walls'}</span>
                </button>
            </div>

            {enabled && (
                <div className="wall-controls-options">
                    <div className="wall-option">
                        <label className="wall-option-label" htmlFor={`${idPrefix}-color`}>
                            Wall color
                        </label>
                        <div className="wall-color-row">
                            <input
                                id={`${idPrefix}-color`}
                                className="wall-color-input"
                                type="color"
                                value={dimensions.wallColor}
                                onChange={(e) => update('wallColor', e.target.value)}
                            />
                            <span className="wall-color-value">{dimensions.wallColor}</span>
                        </div>
                    </div>
                    <div className="wall-option">
                        <div className="wall-thickness-header">
                            <label className="wall-option-label" htmlFor={`${idPrefix}-thickness`}>
                                Thickness
                            </label>
                            <span className="wall-thickness-value">
                                {dimensions.wallThickness.toFixed(2)} {unitLabel}
                            </span>
                        </div>
                        <input
                            id={`${idPrefix}-thickness`}
                            className="wall-thickness-range"
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            value={dimensions.wallThickness}
                            onInput={(e) => update('wallThickness', parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default WallControls;
