import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Menu from './Menu';
import './EditLayout.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, serializeObjectsForSave, getObjectDisplayName, defaultObjectName } from '../utils/layoutObjects';
import { isValidAssetUrl, normalizeAssetUrl } from '../utils/assetUrls';
import { orientObjectToWall, rotateObjectY } from '../utils/layoutBounds';
import { AssetModel } from './AssetModel';

function EditLayout() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [objects, setObjects] = useState(() =>
        normalizeEditorObjects(location.state?.objects || [])
    );
    const [shapeType, setShapeType] = useState('cube');
    const [selectedObject, setSelectedObject] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const [pendingAssetUrl, setPendingAssetUrl] = useState('');
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [assetError, setAssetError] = useState('');

    const orbitControlsRef = useRef();
    const transformControlsRef = useRef();
    const newAssetInputRef = useRef();
    const toolbarAssetInputRef = useRef();
    const replaceAssetInputRef = useRef();
    const convertAssetInputRef = useRef();

    useEffect(() => {
        if (location.state?.objects) return;

        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setObjects(normalizeEditorObjects(response.data.objects));
            } catch (error) {
                console.error('Error fetching layout:', error);
            }
        };
        fetchLayout();
    }, [layoutId, location.state]);

    const handleSaveClick = async () => {
        try {
            const token = localStorage.getItem('token');
            const serializedObjects = serializeObjectsForSave(objects);
            await axios.put(`${API_URL}/layouts/${layoutId}`, { objects: serializedObjects }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            navigate(`/layout/${layoutId}`, { state: { objects: serializedObjects } });
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    const handleEndEditing = () => {
        navigate(`/layout/${layoutId}`, { state: { objects: serializeObjectsForSave(objects) } });
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
        return response.data.url;
    };

    const addAssetObject = (assetUrl, selectAfter = true) => {
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
        };

        setObjects((prev) => {
            newShape.name = defaultObjectName('asset', prev);
            return [...prev, newShape];
        });
        if (selectAfter) setSelectedObject(newShape);
        setPendingAssetUrl('');
        setAssetError('');
        return newShape;
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
            const url = await uploadAssetFile(file);
            if (autoAdd) {
                addAssetObject(url);
            } else {
                setPendingAssetUrl(url);
            }
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
            event.target.value = '';
        }
    };

    const handleAddAssetFromUrl = () => {
        if (!isValidAssetUrl(pendingAssetUrl)) {
            setAssetError('Paste a direct .glb/.gltf URL or a Google Drive share link.');
            return;
        }
        addAssetObject(pendingAssetUrl);
    };

    const handleReplaceAssetFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !activeObject) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const url = await uploadAssetFile(file);
            applyObjectPatch({ assetUrl: normalizeAssetUrl(url), type: 'asset' });
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
                    <div className="toolbar-title">Edit <span>Layout</span></div>
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
