import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import AssetLibraryModal from './AssetLibraryModal';
import './EditLayout.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, serializeObjectsForSave, getObjectDisplayName, defaultObjectName } from '../utils/layoutObjects';
import { isValidAssetUrl, normalizeAssetUrl } from '../utils/assetUrls';
import { orientObjectToWall, rotateObjectY } from '../utils/layoutBounds';
import { AssetModel } from './AssetModel';
import {
    setSketchfabTokens,
    getPendingSketchfabAction,
    clearPendingSketchfabAction,
} from '../utils/sketchfabAuth';

function EditLayout() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [objects, setObjects] = useState(() =>
        normalizeEditorObjects(location.state?.objects || [])
    );
    const [layoutName, setLayoutName] = useState(location.state?.name || '');
    const [shapeType, setShapeType] = useState('cube');
    const [selectedObject, setSelectedObject] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const [pendingAssetUrl, setPendingAssetUrl] = useState('');
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [assetError, setAssetError] = useState('');
    const [layoutError, setLayoutError] = useState('');
    const [showAssetLibraryModal, setShowAssetLibraryModal] = useState(false);

    const orbitControlsRef = useRef();
    const transformControlsRef = useRef();
    const newAssetInputRef = useRef();
    const toolbarAssetInputRef = useRef();
    const replaceAssetInputRef = useRef();
    const convertAssetInputRef = useRef();

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLayoutName(response.data.name || '');
                if (!location.state?.objects) {
                    setObjects(normalizeEditorObjects(response.data.objects));
                }
            } catch (error) {
                console.error('Error fetching layout:', error);
            }
        };
        fetchLayout();
    }, [layoutId, location.state?.objects]);

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) return;

        const pending = getPendingSketchfabAction();
        if (pending?.type !== 'editorAddAsset' || pending.layoutId !== layoutId) return;

        const completeOAuthImport = async () => {
            try {
                const redirectUri = `${window.location.origin}${pending.returnPath || window.location.pathname}`;
                const exchange = await axios.post(
                    `${API_URL}/sketchfab/oauth/exchange`,
                    { code, redirectUri },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setSketchfabTokens({
                    accessToken: exchange.data.accessToken,
                    refreshToken: exchange.data.refreshToken,
                });

                const saveResponse = await axios.post(
                    `${API_URL}/sketchfab/save`,
                    {
                        modelUid: pending.model.uid,
                        modelName: pending.model.name,
                        sketchfabToken: exchange.data.accessToken,
                        thumbnailUrl: pending.model.thumbnailUrl,
                    },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );

                addAssetObject(
                    saveResponse.data.userAsset.assetUrl,
                    true,
                    saveResponse.data.userAsset.name
                );
            } catch (error) {
                console.error('Sketchfab import after OAuth failed:', error);
                setAssetError(error.response?.data?.error || 'Failed to import Sketchfab model.');
            } finally {
                clearPendingSketchfabAction();
                searchParams.delete('code');
                searchParams.delete('state');
                setSearchParams(searchParams, { replace: true });
            }
        };

        completeOAuthImport();
    }, [searchParams, setSearchParams, layoutId]);

    const registerAssetInLibrary = async (assetUrl, name, source = 'url') => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/user-assets`,
                { assetUrl: normalizeAssetUrl(assetUrl), name, source },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.warn('Could not register asset in library:', error);
        }
    };

    const handleSaveClick = async () => {
        if (!layoutName.trim()) {
            setLayoutError('Layout name is required before saving.');
            return;
        }
        setLayoutError('');

        try {
            const token = localStorage.getItem('token');
            const serializedObjects = serializeObjectsForSave(objects);
            await axios.put(`${API_URL}/layouts/${layoutId}`, {
                objects: serializedObjects,
                name: layoutName.trim(),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            navigate(`/layout/${layoutId}`, {
                state: { objects: serializedObjects, name: layoutName.trim() },
            });
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    const handleEndEditing = () => {
        navigate(`/layout/${layoutId}`, {
            state: {
                objects: serializeObjectsForSave(objects),
                name: layoutName.trim(),
            },
        });
    };

    const uploadAssetFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/assets/upload`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        if (response.data.userAsset) {
            // Saved to library via upload endpoint
        }
        return response.data;
    };

    const addAssetObject = (assetUrl, selectAfter = true, assetName = '') => {
        const normalizedUrl = normalizeAssetUrl(assetUrl);
        const newShape = {
            id: Date.now(),
            type: 'asset',
            name: '',
            assetUrl: normalizedUrl,
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            color: '#ffffff',
            opacity: 1,
            size: [1, 1, 1],
            notes: '',
            properties: [],
            log: [],
        };

        setObjects((prev) => {
            newShape.name = assetName?.trim() || defaultObjectName('asset', prev);
            return [...prev, newShape];
        });
        if (selectAfter) setSelectedObject(newShape);
        setPendingAssetUrl('');
        setAssetError('');
        return newShape;
    };

    const handleAddFromLibrary = (asset) => {
        addAssetObject(asset.assetUrl, true, asset.name);
    };

    const addShape = () => {
        const newShape = {
            id: Date.now(),
            type: shapeType,
            name: defaultObjectName(shapeType, objects),
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            color: '#708090',
            opacity: 1,
            size: shapeType === 'sphere' ? [1] : [1, 1, 1],
            notes: '',
            properties: [],
            log: [],
        };
        setObjects([...objects, newShape]);
    };

    const removeSelectedShape = (id) => {
        setObjects(objects.filter((obj) => String(obj.id) !== String(id)));
        setSelectedObject(null);
    };

    const duplicateSelectedShape = () => {
        if (!selectedObject) return;

        const duplicate = {
            id: Date.now(),
            type: selectedObject.type,
            name: selectedObject.name?.trim()
                ? `${selectedObject.name.trim()} (copy)`
                : defaultObjectName(selectedObject.type, objects),
            color: selectedObject.color,
            position: [
                selectedObject.position[0] + 1,
                selectedObject.position[1],
                selectedObject.position[2],
            ],
            rotation: [...(selectedObject.rotation || [0, 0, 0])],
            size: [...selectedObject.size],
            opacity: selectedObject.opacity ?? 1,
            assetUrl: selectedObject.assetUrl ?? '',
            notes: selectedObject.notes ?? '',
            properties: [...(selectedObject.properties || [])],
            log: [...(selectedObject.log || [])],
        };

        setObjects([...objects, duplicate]);
        setSelectedObject(duplicate);
    };

    const updateSelectedObject = (property, value) => {
        if (!selectedObject) return;

        setObjects((prev) =>
            prev.map((obj) =>
                String(obj.id) === String(selectedObject.id) ? { ...obj, [property]: value } : obj
            )
        );
    };

    const activeObject = selectedObject
        ? objects.find((obj) => String(obj.id) === String(selectedObject.id)) ?? null
        : null;

    const applyObjectPatch = (patch) => {
        if (!selectedObject) return;

        setObjects((prev) =>
            prev.map((obj) =>
                String(obj.id) === String(selectedObject.id) ? { ...obj, ...patch } : obj
            )
        );
    };

    const handleRotateQuarterTurn = () => {
        if (!activeObject) return;
        applyObjectPatch({ rotation: rotateObjectY(activeObject) });
    };

    const handleOrientToWall = (wall) => {
        if (!activeObject) return;
        applyObjectPatch(orientObjectToWall(activeObject, wall));
    };

    const formatUploadError = (error) => {
        const status = error.response?.status;
        const msg = error.response?.data?.error;
        if (status === 404) {
            return 'Upload route not found — restart the backend server (npm start).';
        }
        if (status === 401) {
            return 'Not logged in. Please log in and try again.';
        }
        return msg || error.message || 'Failed to upload asset.';
    };

    const handleNewAssetFile = async (event, autoAdd = true) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const data = await uploadAssetFile(file);
            if (autoAdd) {
                const baseName = file.name.replace(/\.(glb|gltf)$/i, '');
                addAssetObject(data.url, true, baseName);
            } else {
                setPendingAssetUrl(data.url);
            }
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
            event.target.value = '';
        }
    };

    const handleAddAssetFromUrl = async () => {
        if (!isValidAssetUrl(pendingAssetUrl)) {
            setAssetError('Paste a direct .glb/.gltf URL or a Google Drive share link.');
            return;
        }
        const normalized = normalizeAssetUrl(pendingAssetUrl);
        addAssetObject(normalized);
        await registerAssetInLibrary(normalized, 'Imported Asset', 'url');
    };

    const handleReplaceAssetFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !activeObject) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const data = await uploadAssetFile(file);
            applyObjectPatch({ assetUrl: normalizeAssetUrl(data.url), type: 'asset' });
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
            event.target.value = '';
        }
    };

    return (
        <div className="app-shell edit-layout-container">
            {showSuccessMessage && <div className="success-message">Layout saved successfully!</div>}
            <Menu />
            <div className="app-main">
                <header className="app-toolbar">
                    <div className="toolbar-title">
                        {layoutName.trim() || 'Layout'} <span>Edit</span>
                    </div>
                    <div className="toolbar-actions">
                        <input
                            ref={toolbarAssetInputRef}
                            type="file"
                            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                            hidden
                            disabled={uploadingAsset}
                            onChange={(e) => handleNewAssetFile(e, true)}
                        />
                        <button
                            type="button"
                            className="btn btn-accent btn-sm"
                            disabled={uploadingAsset}
                            onClick={() => toolbarAssetInputRef.current?.click()}
                        >
                            {uploadingAsset ? 'Uploading…' : 'Upload Asset'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowAssetLibraryModal(true)}
                        >
                            Add Asset
                        </button>
                        <button className="btn btn-success btn-sm" onClick={addShape}>+ Add Shape</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveClick}>Save Layout</button>
                        <button className="btn btn-ghost btn-sm" onClick={handleEndEditing}>Exit</button>
                    </div>
                </header>
                <div className="edit-layout-body">
                    <aside className="side-panel">
                        <div className="side-panel-actions">
                            <button className="btn btn-primary" onClick={handleSaveClick}>Save Layout</button>
                            <button className="btn btn-ghost btn-sm" onClick={handleEndEditing}>Exit</button>
                        </div>
                        <div className="panel-section">
                            <h3 className="panel-heading">Layout</h3>
                            <div className="form-group">
                                <label htmlFor="layout-name">Name</label>
                                <input
                                    id="layout-name"
                                    type="text"
                                    value={layoutName}
                                    placeholder="My layout"
                                    onChange={(e) => {
                                        setLayoutName(e.target.value);
                                        setLayoutError('');
                                    }}
                                />
                                {layoutError && <p className="asset-error">{layoutError}</p>}
                            </div>
                        </div>
                        <div className="panel-section">
                            <h3 className="panel-heading">Add Shape</h3>
                            <div className="form-group">
                                <label htmlFor="shape-select">Type</label>
                                <select
                                    id="shape-select"
                                    value={shapeType}
                                    onChange={(e) => setShapeType(e.target.value)}
                                >
                                    <option value="cube">Cube</option>
                                    <option value="sphere">Sphere</option>
                                    <option value="rectangle">Rectangle</option>
                                </select>
                            </div>
                            <button type="button" className="btn btn-success btn-sm" style={{ width: '100%' }} onClick={addShape}>
                                + Add Shape
                            </button>
                        </div>

                        <div className="panel-section">
                            <h3 className="panel-heading">Upload 3D Asset</h3>
                            <input
                                ref={newAssetInputRef}
                                type="file"
                                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                hidden
                                disabled={uploadingAsset}
                                onChange={(e) => handleNewAssetFile(e, true)}
                            />
                            <div className="upload-dropzone">
                                <button
                                    type="button"
                                    className="btn btn-accent"
                                    style={{ width: '100%' }}
                                    disabled={uploadingAsset}
                                    onClick={() => newAssetInputRef.current?.click()}
                                >
                                    {uploadingAsset ? 'Uploading…' : 'Choose GLB / GLTF File'}
                                </button>
                                <p className="panel-subhint upload-dropzone-hint">
                                    Uploads to cloud storage and adds the model to your layout. Max 25 MB.
                                    Google Drive links: paste the share URL below instead.
                                </p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="asset-url">Or paste cloud URL</label>
                                <input
                                    id="asset-url"
                                    type="url"
                                    value={pendingAssetUrl}
                                    placeholder="https://cdn.example.com/model.glb"
                                    onChange={(e) => {
                                        setPendingAssetUrl(e.target.value);
                                        setAssetError('');
                                    }}
                                />
                            </div>
                            {assetError && <p className="asset-error">{assetError}</p>}
                            <button
                                type="button"
                                className="btn btn-success btn-sm"
                                style={{ width: '100%' }}
                                disabled={uploadingAsset || !isValidAssetUrl(pendingAssetUrl)}
                                onClick={handleAddAssetFromUrl}
                            >
                                Add from URL
                            </button>
                        </div>

                        <div className="panel-section">
                            <h3 className="panel-heading">Asset Library</h3>
                            <p className="panel-subhint">
                                Browse your saved models or search Sketchfab to add to this layout.
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={() => setShowAssetLibraryModal(true)}
                            >
                                Add Asset
                            </button>
                        </div>

                        {activeObject ? (
                            <div className="panel-section">
                                <h3 className="panel-heading">Selected Shape</h3>
                                <div className="selected-badge">{getObjectDisplayName(activeObject)}</div>
                                <div className="form-group">
                                    <label htmlFor="shape-name">Name</label>
                                    <input
                                        id="shape-name"
                                        type="text"
                                        value={activeObject.name ?? ''}
                                        placeholder={defaultObjectName(activeObject.type, objects.filter((o) => o.id !== activeObject.id))}
                                        onChange={(e) => updateSelectedObject('name', e.target.value)}
                                    />
                                </div>
                                {activeObject.type === 'asset' ? (
                                    <>
                                        <div className="form-group">
                                            <label htmlFor="asset-url-selected">Asset URL</label>
                                            <input
                                                id="asset-url-selected"
                                                type="url"
                                                value={activeObject.assetUrl ?? ''}
                                                placeholder="https://cdn.example.com/model.glb"
                                                onChange={(e) => updateSelectedObject('assetUrl', e.target.value)}
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
                                                onChange={handleReplaceAssetFile}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                style={{ width: '100%' }}
                                                disabled={uploadingAsset}
                                                onClick={() => replaceAssetInputRef.current?.click()}
                                            >
                                                {uploadingAsset ? 'Uploading…' : 'Upload New File'}
                                            </button>
                                        </div>
                                        <div className="form-group">
                                            <label>Scale X</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={activeObject.size[0]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [v, activeObject.size[1], activeObject.size[2]]);
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Scale Y</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={activeObject.size[1]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [activeObject.size[0], v, activeObject.size[2]]);
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Scale Z</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={activeObject.size[2]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [activeObject.size[0], activeObject.size[1], v]);
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Transform</label>
                                            <div className="transform-mode-row">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${transformMode === 'translate' ? 'btn-primary active' : 'btn-ghost'}`}
                                                    onClick={() => setTransformMode('translate')}
                                                >
                                                    Move
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${transformMode === 'rotate' ? 'btn-primary active' : 'btn-ghost'}`}
                                                    onClick={() => setTransformMode('rotate')}
                                                >
                                                    Rotate
                                                </button>
                                            </div>
                                            <p className="panel-subhint">
                                                Use the gizmo in the scene, turn 90° in place, or enter rotation below.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn btn-accent btn-sm"
                                                style={{ width: '100%', marginTop: '0.5rem' }}
                                                onClick={handleRotateQuarterTurn}
                                            >
                                                Turn 90°
                                            </button>
                                        </div>
                                        <div className="form-group">
                                            <label>Rotation (degrees)</label>
                                            {['X', 'Y', 'Z'].map((axis, axisIndex) => {
                                                const rotation = activeObject.rotation || [0, 0, 0];
                                                const degrees = Math.round(rotation[axisIndex] * (180 / Math.PI) * 10) / 10;
                                                return (
                                                    <div key={axis} className="form-group" style={{ marginBottom: '0.35rem' }}>
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
                                                                updateSelectedObject('rotation', next);
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
                                                onChange={handleReplaceAssetFile}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-accent btn-sm"
                                                style={{ width: '100%' }}
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
                                                value={activeObject.color}
                                                onChange={(e) => updateSelectedObject('color', e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label>Opacity — {Math.round((activeObject.opacity ?? 1) * 100)}%</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.05"
                                        value={activeObject.opacity ?? 1}
                                        onInput={(e) => updateSelectedObject('opacity', parseFloat(e.target.value))}
                                    />
                                </div>
                                {activeObject.type === 'cube' || activeObject.type === 'rectangle' ? (
                                    <>
                                        <div className="form-group">
                                            <label>Width</label>
                                            <input
                                                type="number"
                                                value={activeObject.size[0]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [v, activeObject.size[1], activeObject.size[2]]);
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Height</label>
                                            <input
                                                type="number"
                                                value={activeObject.size[1]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [activeObject.size[0], v, activeObject.size[2]]);
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Depth</label>
                                            <input
                                                type="number"
                                                value={activeObject.size[2]}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    updateSelectedObject('size', [activeObject.size[0], activeObject.size[1], v]);
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : activeObject.type === 'sphere' ? (
                                    <div className="form-group">
                                        <label>Radius</label>
                                        <input
                                            type="number"
                                            value={activeObject.size[0] / 2}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                updateSelectedObject('size', [v * 2]);
                                            }}
                                        />
                                    </div>
                                ) : null}
                                {(activeObject.type === 'cube' || activeObject.type === 'rectangle') && (
                                    <div className="form-group">
                                        <label>Transform</label>
                                        <div className="transform-mode-row">
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${transformMode === 'translate' ? 'btn-primary active' : 'btn-ghost'}`}
                                                onClick={() => setTransformMode('translate')}
                                            >
                                                Move
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${transformMode === 'rotate' ? 'btn-primary active' : 'btn-ghost'}`}
                                                onClick={() => setTransformMode('rotate')}
                                            >
                                                Rotate
                                            </button>
                                        </div>
                                        <label>Orientation</label>
                                        <p className="panel-subhint">
                                            Snap a shape flush to a layout wall, or turn it 90° in place.
                                        </p>
                                        <div className="wall-orient-grid">
                                            <button type="button" className="btn btn-ghost btn-sm wall-north" onClick={() => handleOrientToWall('north')}>
                                                North
                                            </button>
                                            <button type="button" className="btn btn-ghost btn-sm wall-west" onClick={() => handleOrientToWall('west')}>
                                                West
                                            </button>
                                            <button type="button" className="btn btn-accent btn-sm wall-center" onClick={handleRotateQuarterTurn}>
                                                Turn 90°
                                            </button>
                                            <button type="button" className="btn btn-ghost btn-sm wall-east" onClick={() => handleOrientToWall('east')}>
                                                East
                                            </button>
                                            <button type="button" className="btn btn-ghost btn-sm wall-south" onClick={() => handleOrientToWall('south')}>
                                                South
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="shape-action-row">
                                    <button className="btn btn-accent btn-sm" onClick={duplicateSelectedShape}>Duplicate</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => removeSelectedShape(activeObject.id)}>Remove</button>
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setSelectedObject(null)}>Deselect</button>
                            </div>
                        ) : (
                            <p className="panel-hint">Click a shape in the scene to edit it.</p>
                        )}

                        <div className="panel-section">
                            <h3 className="panel-heading">In Scene ({objects.length})</h3>
                            <ul className="shape-list">
                                {objects.map((object) => (
                                    <li
                                        key={object.id}
                                        className={activeObject && String(activeObject.id) === String(object.id) ? 'selected' : ''}
                                        onClick={() => setSelectedObject(object)}
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
                    </aside>
                    <div className="canvas-container">
                        <Canvas
                            key={`edit-${layoutId}`}
                            shadows
                            camera={{ position: [10, 10, 10], fov: 75 }}
                            gl={{ preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
                        >
                            <Scene
                                objects={objects}
                                setObjects={setObjects}
                                selectedObject={selectedObject}
                                setSelectedObject={setSelectedObject}
                                orbitControlsRef={orbitControlsRef}
                                transformControlsRef={transformControlsRef}
                                transformMode={transformMode}
                            />
                        </Canvas>
                    </div>
                </div>
            </div>
            <AssetLibraryModal
                isOpen={showAssetLibraryModal}
                onClose={() => setShowAssetLibraryModal(false)}
                layoutId={layoutId}
                onAddAsset={handleAddFromLibrary}
            />
        </div>
    );
}

function Scene({
    objects,
    setObjects,
    selectedObject,
    setSelectedObject,
    orbitControlsRef,
    transformControlsRef,
    transformMode,
}) {
    const meshRefs = useRef({});

    const registerMesh = useCallback((id, mesh) => {
        if (mesh) {
            meshRefs.current[id] = mesh;
        } else {
            delete meshRefs.current[id];
        }
    }, []);

    const handleObjectChange = useCallback(() => {
        if (!selectedObject) return;
        const mesh = meshRefs.current[selectedObject.id];
        if (!mesh) return;

        setObjects((prev) => {
            const updated = prev.map((obj) => {
                if (String(obj.id) !== String(selectedObject.id)) return obj;
                return {
                    ...obj,
                    position: [
                        parseFloat(mesh.position.x.toFixed(2)),
                        parseFloat(mesh.position.y.toFixed(2)),
                        parseFloat(mesh.position.z.toFixed(2)),
                    ],
                    rotation: [
                        parseFloat(mesh.rotation.x.toFixed(4)),
                        parseFloat(mesh.rotation.y.toFixed(4)),
                        parseFloat(mesh.rotation.z.toFixed(4)),
                    ],
                };
            });
            return updated;
        });
    }, [selectedObject, setObjects]);

    const selectedMesh = selectedObject ? meshRefs.current[selectedObject.id] ?? meshRefs.current[String(selectedObject.id)] : null;

    return (
        <>
            <LayoutSceneEnvironment />
            {objects.map((object) => (
                <Shape
                    key={object.id}
                    object={object}
                    onSelect={setSelectedObject}
                    registerMesh={registerMesh}
                />
            ))}
            <OrbitControls ref={orbitControlsRef} makeDefault enabled={!selectedObject} />
            {selectedMesh && (
                <TransformControls
                    ref={transformControlsRef}
                    object={selectedMesh}
                    mode={transformMode}
                    onMouseDown={() => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                        handleObjectChange();
                    }}
                    onDragEnd={handleObjectChange}
                />
            )}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(null);
                }}
                position={[0, -1000, 0]}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

function Shape({ object, onSelect, registerMesh }) {
    if (object.type === 'asset') {
        const rawOpacity = object.opacity ?? 1;
        const isOpaque = rawOpacity >= 0.995;
        const opacity = isOpaque ? 1 : rawOpacity;

        return (
            <AssetModel
                url={object.assetUrl}
                object={object}
                objectId={object.id}
                position={object.position}
                rotation={object.rotation || [0, 0, 0]}
                scale={object.size || [1, 1, 1]}
                opacity={opacity}
                isOpaque={isOpaque}
                renderOrder={isOpaque ? 1 : 2}
                onSelect={onSelect}
                registerMesh={registerMesh}
            />
        );
    }

    return (
        <PrimitiveShape object={object} onSelect={onSelect} registerMesh={registerMesh} />
    );
}

function PrimitiveShape({ object, onSelect, registerMesh }) {
    const meshRef = useRef();
    const { type, position, rotation = [0, 0, 0], color, size } = object;
    const rawOpacity = object.opacity ?? 1;
    const isOpaque = rawOpacity >= 0.995;
    const opacity = isOpaque ? 1 : rawOpacity;

    useEffect(() => {
        if (meshRef.current) {
            registerMesh(object.id, meshRef.current);
        }
        return () => registerMesh(object.id, null);
    }, [object.id, registerMesh]);

    useLayoutEffect(() => {
        const material = meshRef.current?.material;
        if (!material) return;
        material.color.set(color);
        material.opacity = opacity;
        material.transparent = !isOpaque;
        material.depthWrite = isOpaque;
        material.depthTest = true;
        material.needsUpdate = true;
    }, [color, opacity, isOpaque]);

    const geometryProps = () => {
        switch (type) {
            case 'sphere':
                return <sphereGeometry args={[size[0] / 2, 32, 32]} />;
            case 'rectangle':
            case 'cube':
            default:
                return <boxGeometry args={size} />;
        }
    };

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(object);
            }}
            castShadow
            receiveShadow
            renderOrder={isOpaque ? 1 : 2}
        >
            {geometryProps()}
            <meshStandardMaterial
                color={color}
                roughness={0.55}
                metalness={0.1}
                transparent={!isOpaque}
                opacity={opacity}
                depthWrite={isOpaque}
                depthTest
            />
        </mesh>
    );
}

export default EditLayout;
