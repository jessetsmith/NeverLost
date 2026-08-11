import React from 'react';
import { getObjectDisplayName, defaultObjectName } from '../utils/layoutObjects';
import { SketchfabCreditText } from './SketchfabAssetCredit';
import AssetLoadHelpBanner from './AssetLoadHelpBanner';
import DraftNumberInput from './DraftNumberInput';
import { useAssetLoadState } from '../context/AssetLoadStateContext';
import './SketchfabAssetCredit.css';

function EditObjectPanel({
    object,
    objects,
    transformMode,
    onTransformModeChange,
    onUpdate,
    onRotateQuarterTurn,
    onOrientToWall,
    onRecenter,
    onDuplicate,
    onRemove,
    onDeselect,
    uploadingAsset,
    assetError,
    replaceAssetInputRef,
    convertAssetInputRef,
    onReplaceAssetFile,
}) {
    const assetLoadFailed = useAssetLoadState(object?.id) === 'failed';

    if (!object) return null;

    const otherObjects = objects.filter((o) => o.id !== object.id);
    const isBoxShape = object.type === 'cube' || object.type === 'rectangle';

    const transformHint = transformMode === 'scale'
        ? (isBoxShape
            ? 'Drag a face handle to resize from that edge. The opposite edge stays fixed. Snaps to 0.5 ft/m grid.'
            : 'Drag the axis handles on the gizmo to resize. Snaps to 0.5 ft/m grid.')
        : transformMode === 'rotate'
            ? 'Drag the rotation rings, turn 90° in place, or enter rotation below.'
            : 'Drag the arrows to move the shape in the scene.';

    const transformControls = (
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
                <button
                    type="button"
                    className={`btn btn-sm ${transformMode === 'scale' ? 'btn-secondary active' : 'btn-ghost'}`}
                    onClick={() => onTransformModeChange('scale')}
                >
                    Resize
                </button>
            </div>
            <p className="panel-subhint">{transformHint}</p>
        </div>
    );

    const orientationControls = isBoxShape ? (
        <div className="form-group">
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
    ) : null;

    const rotationQuickControls = !isBoxShape ? (
        <div className="form-group">
            <label>Quick rotation</label>
            <p className="panel-subhint">
                Turn the object 90° in place, or use the axis fields below.
            </p>
            <button
                type="button"
                className="btn btn-secondary btn-sm edit-object-panel-full-btn"
                onClick={onRotateQuarterTurn}
            >
                Turn 90°
            </button>
        </div>
    ) : null;

    const rotationFields = (
        <div className="form-group">
            <label>Rotation (degrees)</label>
            {['X', 'Y', 'Z'].map((axis, axisIndex) => {
                const rotation = object.rotation || [0, 0, 0];
                const degrees = Math.round(rotation[axisIndex] * (180 / Math.PI) * 10) / 10;
                return (
                    <div key={axis} className="form-group edit-object-panel-nested-field">
                        <label htmlFor={`object-rotation-${object.id}-${axis.toLowerCase()}`}>{axis}</label>
                        <DraftNumberInput
                            id={`object-rotation-${object.id}-${axis.toLowerCase()}`}
                            key={`rotation-${object.id}-${axis}`}
                            step={1}
                            value={degrees}
                            onCommit={(value) => {
                                const next = [...rotation];
                                next[axisIndex] = value * (Math.PI / 180);
                                onUpdate('rotation', next);
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );

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

                <div className="edit-object-panel-body scroll-panel">
                    <AssetLoadHelpBanner object={object} failed={assetLoadFailed} />
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

                    <div className="form-group">
                        <label>Position</label>
                        <p className="panel-subhint">
                            Return this object to the center of the layout grid.
                        </p>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm edit-object-panel-full-btn"
                            onClick={onRecenter}
                        >
                            Re-center
                        </button>
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
                            {transformControls}
                            <div className="form-group">
                                <label htmlFor="asset-scale">Scale</label>
                                <DraftNumberInput
                                    id="asset-scale"
                                    key={`scale-${object.id}`}
                                    min={0.1}
                                    step={0.1}
                                    value={object.size[0]}
                                    onCommit={(v) => onUpdate('size', [v, v, v])}
                                />
                            </div>
                            {rotationQuickControls}
                            {rotationFields}
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
                            {transformControls}
                            {orientationControls}
                            {rotationQuickControls}
                            {rotationFields}
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
                                <label htmlFor="shape-width">Width</label>
                                <DraftNumberInput
                                    id="shape-width"
                                    key={`width-${object.id}`}
                                    value={object.size[0]}
                                    onCommit={(v) => onUpdate('size', [v, object.size[1], object.size[2]])}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="shape-height">Height</label>
                                <DraftNumberInput
                                    id="shape-height"
                                    key={`height-${object.id}`}
                                    value={object.size[1]}
                                    onCommit={(v) => onUpdate('size', [object.size[0], v, object.size[2]])}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="shape-depth">Depth</label>
                                <DraftNumberInput
                                    id="shape-depth"
                                    key={`depth-${object.id}`}
                                    value={object.size[2]}
                                    onCommit={(v) => onUpdate('size', [object.size[0], object.size[1], v])}
                                />
                            </div>
                        </>
                    ) : object.type === 'sphere' ? (
                        <div className="form-group">
                            <label htmlFor="shape-radius">Radius</label>
                            <DraftNumberInput
                                id="shape-radius"
                                key={`radius-${object.id}`}
                                min={0.05}
                                step={0.1}
                                value={object.size[0] / 2}
                                onCommit={(v) => onUpdate('size', [v * 2])}
                            />
                        </div>
                    ) : null}

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
