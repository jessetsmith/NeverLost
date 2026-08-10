import React from 'react';
import { DEFAULT_SCENE_SETTINGS } from '../utils/sceneSettings';

function SceneSettingsPanel({ settings, onChange }) {
    const update = (key, value) => {
        onChange({ ...settings, [key]: value });
    };

    return (
        <div className="scene-settings-panel">
            <div className="form-group">
                <label htmlFor="scene-background">Background</label>
                <input
                    id="scene-background"
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => update('backgroundColor', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-ground">Ground</label>
                <input
                    id="scene-ground"
                    type="color"
                    value={settings.groundColor}
                    onChange={(e) => update('groundColor', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-sky">Sky light</label>
                <input
                    id="scene-sky"
                    type="color"
                    value={settings.skyColor}
                    onChange={(e) => update('skyColor', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-light-color">Sun color</label>
                <input
                    id="scene-light-color"
                    type="color"
                    value={settings.lightColor}
                    onChange={(e) => update('lightColor', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-light-intensity">
                    Sun intensity — {settings.lightIntensity.toFixed(1)}
                </label>
                <input
                    id="scene-light-intensity"
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    value={settings.lightIntensity}
                    onInput={(e) => update('lightIntensity', parseFloat(e.target.value))}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-ambient">
                    Ambient light — {settings.ambientIntensity.toFixed(2)}
                </label>
                <input
                    id="scene-ambient"
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={settings.ambientIntensity}
                    onInput={(e) => update('ambientIntensity', parseFloat(e.target.value))}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-accent">Accent glow</label>
                <input
                    id="scene-accent"
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => update('accentColor', e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="scene-fill">Fill light</label>
                <input
                    id="scene-fill"
                    type="color"
                    value={settings.fillLightColor}
                    onChange={(e) => update('fillLightColor', e.target.value)}
                />
            </div>
            <div className="form-group scene-settings-toggle">
                <label htmlFor="scene-fog">
                    <input
                        id="scene-fog"
                        type="checkbox"
                        checked={settings.fogEnabled}
                        onChange={(e) => update('fogEnabled', e.target.checked)}
                    />
                    {' '}Atmospheric fog
                </label>
            </div>
            <button
                type="button"
                className="btn btn-ghost btn-sm scene-settings-reset"
                onClick={() => onChange({ ...DEFAULT_SCENE_SETTINGS })}
            >
                Reset scene defaults
            </button>
        </div>
    );
}

export default SceneSettingsPanel;
