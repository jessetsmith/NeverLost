import React, { useState } from 'react';
import LayoutDimensionsFields from './LayoutDimensionsFields';
import RoomShapeSelector from './RoomShapeSelector';
import WallControls from './WallControls';
import FloorplanPanel from './FloorplanPanel';
import EditorCameraPanel from './EditorCameraPanel';
import { getObjectDisplayName } from '../utils/layoutObjects';
import { isSquareLockedShape } from '../utils/roomShapes';

const TABS = [
    {
        id: 'layout',
        label: 'Layout',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" />
                <rect x="3" y="4" width="18" height="16" rx="2" />
            </svg>
        ),
    },
    {
        id: 'room',
        label: 'Room',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M4 20V8l8-4 8 4v12" strokeLinejoin="round" />
                <path d="M4 8h16M12 4v16" />
            </svg>
        ),
    },
    {
        id: 'view',
        label: 'View',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M4 10a8 8 0 0 1 16 0v4H4v-4Z" />
                <circle cx="12" cy="10" r="2.5" />
                <path d="M8 20h8" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        id: 'objects',
        label: 'Objects',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path d="M8 6h12v12H8z" />
                <path d="M4 10h12v12H4z" opacity="0.55" />
            </svg>
        ),
    },
];

function EditLayoutSidePanel({
    layoutName,
    onLayoutNameChange,
    layoutError,
    shapeType,
    onShapeTypeChange,
    onAddShape,
    onOpenAssetLibrary,
    layoutDimensions,
    onLayoutDimensionsChange,
    onFloorplanDimensionsChange,
    dimensionsFieldsRef,
    orbitControlsRef,
    activeObject,
    onOpenSceneSettings,
    objects,
    onSelectObject,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    onExit,
}) {
    const [activeTab, setActiveTab] = useState('layout');

    return (
        <aside className="side-panel">
            <div className="side-panel-actions">
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={onUndo}
                    disabled={!canUndo}
                >
                    Undo
                </button>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={onRedo}
                    disabled={!canRedo}
                >
                    Redo
                </button>
                <button type="button" className="btn btn-secondary" onClick={onSave}>Save Layout</button>
                <button type="button" className="btn btn-directional btn-sm" onClick={onExit}>Exit</button>
            </div>

            <nav className="side-panel-nav" aria-label="Editor sections">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`side-panel-nav-tab${activeTab === tab.id ? ' is-active' : ''}`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="side-panel-nav-icon">{tab.icon}</span>
                        <span className="side-panel-nav-label">{tab.label}</span>
                        {tab.id === 'objects' && objects.length > 0 && (
                            <span className="side-panel-nav-badge">{objects.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="side-panel-tab-panels scroll-panel">
                {activeTab === 'layout' && (
                    <div className="side-panel-tab-panel">
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Layout</h3>
                            <div className="form-group">
                                <label htmlFor="layout-name">Name</label>
                                <input
                                    id="layout-name"
                                    type="text"
                                    value={layoutName}
                                    placeholder="My layout"
                                    onChange={(e) => onLayoutNameChange(e.target.value)}
                                />
                                {layoutError && <p className="asset-error">{layoutError}</p>}
                            </div>
                        </div>
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Add Basic Shape</h3>
                            <div className="form-group">
                                <label htmlFor="shape-select">Type</label>
                                <select
                                    id="shape-select"
                                    value={shapeType}
                                    onChange={(e) => onShapeTypeChange(e.target.value)}
                                >
                                    <option value="cube">Cube</option>
                                    <option value="sphere">Sphere</option>
                                    <option value="rectangle">Rectangle</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%' }}
                                onClick={onAddShape}
                            >
                                Add Basic Shape
                            </button>
                        </div>
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Add Asset</h3>
                            <p className="panel-subhint">
                                Upload a file, paste a URL, or browse your library and Sketchfab.
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={onOpenAssetLibrary}
                            >
                                Add Asset
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'room' && (
                    <div className="side-panel-tab-panel">
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Room Size</h3>
                            <RoomShapeSelector
                                dimensions={layoutDimensions}
                                onChange={onLayoutDimensionsChange}
                                idPrefix="edit-room-shape"
                            />
                            <LayoutDimensionsFields
                                ref={dimensionsFieldsRef}
                                dimensions={layoutDimensions}
                                onChange={onLayoutDimensionsChange}
                                lockDepthToWidth={isSquareLockedShape(layoutDimensions.roomShape)}
                                idPrefix="edit-layout-dim"
                            />
                            <WallControls
                                dimensions={layoutDimensions}
                                onChange={onFloorplanDimensionsChange}
                                idPrefix="edit-wall"
                            />
                        </div>
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Floorplan</h3>
                            <FloorplanPanel
                                dimensions={layoutDimensions}
                                onChange={onFloorplanDimensionsChange}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'view' && (
                    <div className="side-panel-tab-panel">
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Camera</h3>
                            <EditorCameraPanel
                                orbitControlsRef={orbitControlsRef}
                                layoutDimensions={layoutDimensions}
                                selectedObject={activeObject}
                            />
                        </div>
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">Scene</h3>
                            <p className="panel-subhint">
                                Background, lighting, fog, and ground colors for this layout.
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%' }}
                                onClick={onOpenSceneSettings}
                            >
                                Scene Controls
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'objects' && (
                    <div className="side-panel-tab-panel">
                        <div className="panel-section panel-section-flush">
                            <h3 className="panel-heading">In Scene ({objects.length})</h3>
                            {!activeObject && (
                                <p className="panel-hint">Click an object in the scene to edit it.</p>
                            )}
                            <ul className="shape-list">
                                {objects.map((object) => (
                                    <li
                                        key={object.id}
                                        className={activeObject && String(activeObject.id) === String(object.id) ? 'selected' : ''}
                                        onClick={() => onSelectObject(object)}
                                    >
                                        <span className="shape-type-dot" style={{ background: object.color }} />
                                        <span className="shape-label-wrap">
                                            <span className="shape-label">{getObjectDisplayName(object)}</span>
                                            {object.name?.trim() && (
                                                <span className="shape-type-meta">{object.type}</span>
                                            )}
                                            {!object.name?.trim() && object.type === 'asset' && (
                                                <span className="shape-type-meta">asset</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

export default EditLayoutSidePanel;
