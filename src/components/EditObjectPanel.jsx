import React from 'react';
import { getObjectDisplayName, defaultObjectName } from '../utils/layoutObjects';
import { SketchfabCreditText } from './SketchfabAssetCredit';
import './SketchfabAssetCredit.css';

function EditObjectPanel({
    object,
    objects,
    transformMode,
    onTransformModeChange,
    onUpdate,
    onRotateQuarterTurn,
    onOrientToWall,
    onDuplicate,
    onRemove,
    onDeselect,
    uploadingAsset,
    assetError,
    replaceAssetInputRef,
    convertAssetInputRef,
    onReplaceAssetFile,
}) {
    if (!object) return null;

    const otherObjects = objects.filter((o) => o.id !== object.id);

    return (
        <div className="edit-object-panel-layer">
            <aside className="edit-object-panel" aria-label="Object edit controls">
                <header className="edit-object-panel-header">
                    <div>
                        <h3 className="edit-object-panel-title">{getObjectDisplayName(object)}</h3>
                        <p className="edit-object-panel-subtitle">
                            {object.type === 'asset' ? '3D Asset' : object.type.charAt(0).toUpperCase() + object.type.slice(1)}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-directional btn-sm edit-object-panel-close"
                        onClick={onDeselect}
                        aria-label="Deselect object"
                    >
                        ✕
                    </button>
                </header>

                <div className="edit-object-panel-body">
                    {object.sketchfabCredit && (
                        <div className="sketchfab-credit-panel">
                            <SketchfabCreditText credit={object.sketchfabCredit} />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="shape-name">Name</label>
                        <input
                            id="shape-name"
                            type="text"
                            value={object.name ?? ''}
                            placeholder={defaultObjectName(object.type, otherObjects)}
                            onChange={(e) => onUpdate('name', e.target.value)}
                        />
                    </div>

                    {object.type === 'asset' ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="asset-url-selected">Asset URL</label>
                                <input
                                    id="asset-url-selected"
                                    type="url"
                                    value={object.assetUrl ?? ''}
                                    placeholder="https://cdn.example.com/model.glb"
                                    onChange={(e) => onUpdate('assetUrl', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="asset-replace">Replace file</label>
                                <input
                                    ref={replaceAssetInputRef}
                                    id="asset-replace"
                                    type="file"
                                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                    hidden
                                    disabled={uploadingAsset}
                                    onChange={onReplaceAssetFile}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm edit-object-panel-full-btn"
                                    disabled={uploadingAsset}
                                    onClick={() => replaceAssetInputRef.current?.click()}
                                >
                                    {uploadingAsset ? 'Uploading…' : 'Upload New File'}
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Scale</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={object.size[0]}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        if (Number.isNaN(v)) return;
                                        onUpdate('size', [v, v, v]);
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Transform</label>
                                <div className="transform-mode-row">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${transformMode === 'translate' ? 'btn-secondary active' : 'btn-ghost'}`}
                                        onClick={() => onTransformModeChange('translate')}
                                    >
                                        Move
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${transformMode === 'rotate' ? 'btn-secondary active' : 'btn-ghost'}`}
                                        onClick={() => onTransformModeChange('rotate')}
                                    >
                                        Rotate
                                    </button>
                                </div>
                                <p className="panel-subhint">
                                    Use the gizmo in the scene, turn 90° in place, or enter rotation below.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm edit-object-panel-full-btn"
                                    onClick={onRotateQuarterTurn}
                                >
                                    Turn 90°
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Rotation (degrees)</label>
                                {['X', 'Y', 'Z'].map((axis, axisIndex) => {
                                    const rotation = object.rotation || [0, 0, 0];
                                    const degrees = Math.round(rotation[axisIndex] * (180 / Math.PI) * 10) / 10;
                                    return (
                                        <div key={axis} className="form-group edit-object-panel-nested-field">
                                            <label>{axis}</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={degrees}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value);
                                                    if (Number.isNaN(value)) return;
                                                    const next = [...rotation];
                                                    next[axisIndex] = value * (Math.PI / 180);
                                                    onUpdate('rotation', next);
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {assetError && <p className="asset-error">{assetError}</p>}
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Replace with 3D model</label>
                                <input
                                    ref={convertAssetInputRef}
                                    type="file"
                                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                    hidden
                                    disabled={uploadingAsset}
                                    onChange={onReplaceAssetFile}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm edit-object-panel-full-btn"
                                    disabled={uploadingAsset}
                                    onClick={() => convertAssetInputRef.current?.click()}
                                >
                                    {uploadingAsset ? 'Uploading…' : 'Upload GLB / GLTF'}
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Color</label>
                                <input
                                    type="color"
                                    value={object.color}
                                    onChange={(e) => onUpdate('color', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Opacity — {Math.round((object.opacity ?? 1) * 100)}%</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={object.opacity ?? 1}
                            onInput={(e) => onUpdate('opacity', parseFloat(e.target.value))}
                        />
                    </div>

                    {object.type === 'cube' || object.type === 'rectangle' ? (
                        <>
                            <div className="form-group">
                                <label>Width</label>
                                <input
                                    type="number"
                                    value={object.size[0]}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        onUpdate('size', [v, object.size[1], object.size[2]]);
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Height</label>
                                <input
                                    type="number"
                                    value={object.size[1]}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        onUpdate('size', [object.size[0], v, object.size[2]]);
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Depth</label>
                                <input
                                    type="number"
                                    value={object.size[2]}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        onUpdate('size', [object.size[0], object.size[1], v]);
                                    }}
                                />
                            </div>
                        </>
                    ) : object.type === 'sphere' ? (
                        <div className="form-group">
                            <label>Radius</label>
                            <input
                                type="number"
                                value={object.size[0] / 2}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    onUpdate('size', [v * 2]);
                                }}
                            />
                        </div>
                    ) : null}

                    {(object.type === 'cube' || object.type === 'rectangle') && (
                        <div className="form-group">
                            <label>Transform</label>
                            <div className="transform-mode-row">
                                <button
                                    type="button"
                                    className={`btn btn-sm ${transformMode === 'translate' ? 'btn-secondary active' : 'btn-ghost'}`}
                                    onClick={() => onTransformModeChange('translate')}
                                >
                                    Move
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${transformMode === 'rotate' ? 'btn-secondary active' : 'btn-ghost'}`}
                                    onClick={() => onTransformModeChange('rotate')}
                                >
                                    Rotate
                                </button>
                            </div>
                            <label>Orientation</label>
                            <p className="panel-subhint">
                                Snap a shape flush to a layout wall, or turn it 90° in place.
                            </p>
                            <div className="wall-orient-grid">
                                <button type="button" className="btn btn-directional btn-sm wall-north" onClick={() => onOrientToWall('north')}>
                                    North
                                </button>
                                <button type="button" className="btn btn-directional btn-sm wall-west" onClick={() => onOrientToWall('west')}>
                                    West
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm wall-center" onClick={onRotateQuarterTurn}>
                                    Turn 90°
                                </button>
                                <button type="button" className="btn btn-directional btn-sm wall-east" onClick={() => onOrientToWall('east')}>
                                    East
                                </button>
                                <button type="button" className="btn btn-directional btn-sm wall-south" onClick={() => onOrientToWall('south')}>
                                    South
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="shape-action-row">
                        <button className="btn btn-secondary btn-sm" type="button" onClick={onDuplicate}>Duplicate</button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => onRemove(object.id)}>Remove</button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default EditObjectPanel;
