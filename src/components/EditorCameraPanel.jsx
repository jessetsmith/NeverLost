import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    EDITOR_CAMERA_VIEWS,
    applyEditorCameraPan,
    captureEditorCameraState,
    getEditorCameraPanLimit,
    getEditorCameraView,
    getEditorCameraFocus,
    flyCameraTo,
} from '../utils/editorCamera';
import './EditorCameraPanel.css';

function EditorCameraPanel({ orbitControlsRef, layoutDimensions, selectedObject }) {
    const panLimit = getEditorCameraPanLimit(layoutDimensions);
    const unitLabel = layoutDimensions?.unit === 'm' ? 'm' : 'ft';

    const [panX, setPanX] = useState(0);
    const [panZ, setPanZ] = useState(0);
    const panXRef = useRef(0);
    const panZRef = useRef(0);
    const baseRef = useRef(null);

    const syncBaseFromControls = useCallback(() => {
        const controls = orbitControlsRef.current;
        const captured = captureEditorCameraState(controls);
        if (captured) {
            baseRef.current = captured;
        }
    }, [orbitControlsRef]);

    const applyPan = useCallback((nextX, nextZ) => {
        const controls = orbitControlsRef.current;
        if (!controls || !baseRef.current) return;
        applyEditorCameraPan(controls, nextX, nextZ, baseRef.current);
    }, [orbitControlsRef]);

    const resetPan = useCallback(() => {
        panXRef.current = 0;
        panZRef.current = 0;
        setPanX(0);
        setPanZ(0);
    }, []);

    const finishCameraMove = useCallback(() => {
        resetPan();
        syncBaseFromControls();
    }, [resetPan, syncBaseFromControls]);

    useEffect(() => {
        panXRef.current = panX;
        panZRef.current = panZ;
    }, [panX, panZ]);

    useEffect(() => {
        let cancelled = false;
        let controls = orbitControlsRef.current;

        const attach = () => {
            if (!controls?.object) return undefined;

            syncBaseFromControls();

            const handleEnd = () => {
                if (panXRef.current === 0 && panZRef.current === 0) {
                    syncBaseFromControls();
                }
            };

            controls.addEventListener('end', handleEnd);
            return () => controls.removeEventListener('end', handleEnd);
        };

        let detach = attach();
        if (detach) {
            return () => {
                cancelled = true;
                detach();
            };
        }

        const intervalId = window.setInterval(() => {
            if (cancelled) return;
            controls = orbitControlsRef.current;
            detach = attach();
            if (detach) {
                window.clearInterval(intervalId);
            }
        }, 100);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            detach?.();
        };
    }, [orbitControlsRef, syncBaseFromControls]);

    const goToView = (viewId) => {
        const controls = orbitControlsRef.current;
        if (!controls) return;
        const view = getEditorCameraView(viewId, layoutDimensions);
        flyCameraTo(controls, view.position, view.target, 480, finishCameraMove);
    };

    const focusSelection = () => {
        if (!selectedObject) return;
        const controls = orbitControlsRef.current;
        if (!controls) return;
        const view = getEditorCameraFocus(selectedObject.position, layoutDimensions);
        flyCameraTo(controls, view.position, view.target, 480, finishCameraMove);
    };

    const handlePanX = (value) => {
        const next = parseFloat(value);
        setPanX(next);
        applyPan(next, panZRef.current);
    };

    const handlePanZ = (value) => {
        const next = parseFloat(value);
        setPanZ(next);
        applyPan(panXRef.current, next);
    };

    return (
        <div className="editor-camera-panel">
            <p className="editor-camera-hint">
                Jump the camera to frame the room or a specific edge. Orbit with drag, scroll to zoom.
            </p>
            <div className="camera-view-grid">
                {EDITOR_CAMERA_VIEWS.map((view) => (
                    <button
                        key={view.id}
                        type="button"
                        className="btn btn-secondary btn-sm camera-view-btn"
                        title={view.label}
                        onClick={() => goToView(view.id)}
                    >
                        {view.shortLabel}
                    </button>
                ))}
            </div>
            <div className="camera-view-actions">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => goToView('overview')}
                >
                    Fit entire room
                </button>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%' }}
                    disabled={!selectedObject}
                    onClick={focusSelection}
                >
                    Focus selected object
                </button>
            </div>
            <div className="camera-pan-sliders">
                <div className="camera-pan-row">
                    <div className="camera-pan-label-row">
                        <label className="camera-pan-label" htmlFor="camera-pan-ew">
                            East ↔ West
                        </label>
                        <span className="camera-pan-value">
                            {panX > 0 ? 'E' : panX < 0 ? 'W' : '—'} {Math.abs(panX).toFixed(1)} {unitLabel}
                        </span>
                    </div>
                    <input
                        id="camera-pan-ew"
                        type="range"
                        min={-panLimit}
                        max={panLimit}
                        step={0.25}
                        value={panX}
                        onInput={(e) => handlePanX(e.target.value)}
                    />
                </div>
                <div className="camera-pan-row">
                    <div className="camera-pan-label-row">
                        <label className="camera-pan-label" htmlFor="camera-pan-ns">
                            North ↔ South
                        </label>
                        <span className="camera-pan-value">
                            {panZ > 0 ? 'N' : panZ < 0 ? 'S' : '—'} {Math.abs(panZ).toFixed(1)} {unitLabel}
                        </span>
                    </div>
                    <input
                        id="camera-pan-ns"
                        type="range"
                        min={-panLimit}
                        max={panLimit}
                        step={0.25}
                        value={panZ}
                        onInput={(e) => handlePanZ(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

export default EditorCameraPanel;
