import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import AssetLibraryModal from './AssetLibraryModal';
import ShareLayoutModal from './ShareLayoutModal';
import EditObjectPanel from './EditObjectPanel';
import EditLayoutSidePanel from './EditLayoutSidePanel';
import SceneSettingsModal from './SceneSettingsModal';
import LayoutThumbnail from './LayoutThumbnail';
import { AssetLoadStateProvider } from '../context/AssetLoadStateContext';
import './EditLayout.css';
import './Social.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, serializeObjectsForSave, defaultObjectName, readObjectTransformFromMesh, applyMeshTransformsToObjects, isBoxEdgeResizableType } from '../utils/layoutObjects';
import { isValidAssetUrl, normalizeAssetUrl } from '../utils/assetUrls';
import { getAuthToken } from '../utils/authSession';
import { orientObjectToWall, rotateObjectY } from '../utils/layoutBounds';
import { AssetModel } from './AssetModel';
import SketchfabAssetCredit from './SketchfabAssetCredit';
import {
    setSketchfabTokens,
    getPendingSketchfabAction,
    clearPendingSketchfabAction,
} from '../utils/sketchfabAuth';
import { useUndoableState } from '../hooks/useUndoableState';
import { normalizeSceneSettings, serializeSceneSettings } from '../utils/sceneSettings';
import {
    normalizeLayoutDimensions,
    serializeLayoutDimensions,
    getEditorCameraPosition,
    rescaleLayoutObjects,
} from '../utils/layoutDimensions';
import { getEditorOrbitLimits } from '../utils/editorCamera';
import { uploadLayoutThumbnailCapture } from '../utils/layoutThumbnail';
import BoxEdgeResizeHandles from './BoxEdgeResizeHandles';

const GRID_SNAP = 0.5;

function EditLayout() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        state: objects,
        setState: setObjects,
        setStateWithoutHistory: setObjectsWithoutHistory,
        undo: undoObjects,
        redo: redoObjects,
        canUndo,
        canRedo,
        resetHistory: resetObjectHistory,
    } = useUndoableState(normalizeEditorObjects(location.state?.objects || []));
    const [layoutName, setLayoutName] = useState(location.state?.name || '');
    const [sceneSettings, setSceneSettings] = useState(() =>
        normalizeSceneSettings(location.state?.sceneSettings)
    );
    const [layoutDimensions, setLayoutDimensions] = useState(() =>
        normalizeLayoutDimensions(location.state?.layoutDimensions)
    );
    const [shapeType, setShapeType] = useState('cube');
    const [selectedObject, setSelectedObject] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const [pendingAssetUrl, setPendingAssetUrl] = useState('');
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [assetError, setAssetError] = useState('');
    const [layoutError, setLayoutError] = useState('');
    const [layoutRole, setLayoutRole] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showAssetLibraryModal, setShowAssetLibraryModal] = useState(false);
    const [showSceneSettingsModal, setShowSceneSettingsModal] = useState(false);
    const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
    const [assetLibraryInitialTab, setAssetLibraryInitialTab] = useState('import');

    const orbitControlsRef = useRef();
    const transformControlsRef = useRef();
    const transformDragRef = useRef(false);
    const replaceAssetInputRef = useRef();
    const convertAssetInputRef = useRef();
    const prevDimensionsRef = useRef(normalizeLayoutDimensions(location.state?.layoutDimensions));
    const dimensionsFieldsRef = useRef(null);
    const flushSceneTransformsRef = useRef(null);
    const thumbnailCaptureRef = useRef(null);

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const token = getAuthToken();
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLayoutName(response.data.name || '');
                setLayoutRole(response.data.role || null);
                if (!location.state?.sceneSettings) {
                    setSceneSettings(normalizeSceneSettings(response.data.sceneSettings));
                }
                if (!location.state?.layoutDimensions) {
                    const loaded = normalizeLayoutDimensions(response.data.layoutDimensions);
                    setLayoutDimensions(loaded);
                    prevDimensionsRef.current = loaded;
                }
                if (response.data.role === 'viewer') {
                    navigate(`/layout/${layoutId}`, { replace: true });
                    return;
                }
                if (!location.state?.objects) {
                    setObjectsWithoutHistory(normalizeEditorObjects(response.data.objects));
                    resetObjectHistory();
                }
            } catch (error) {
                console.error('Error fetching layout:', error);
                if (error.response?.status === 403 || error.response?.status === 404) {
                    navigate(`/layout/${layoutId}`, { replace: true });
                }
            }
        };
        fetchLayout();
    }, [layoutId, location.state?.objects, navigate, setObjectsWithoutHistory, resetObjectHistory]);

    useEffect(() => {
        if (!selectedObject) return;

        const match = objects.find((obj) => String(obj.id) === String(selectedObject.id));
        if (!match) {
            setSelectedObject(null);
            return;
        }

        if (match !== selectedObject) {
            setSelectedObject(match);
        }
    }, [objects, selectedObject]);

    const handleUndo = useCallback(() => {
        undoObjects();
    }, [undoObjects]);

    const handleRedo = useCallback(() => {
        redoObjects();
    }, [redoObjects]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const modifier = event.metaKey || event.ctrlKey;
            if (!modifier || key !== 'z') return;

            const tag = event.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable) {
                return;
            }

            event.preventDefault();
            if (event.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) return;

        const pending = getPendingSketchfabAction();
        if (pending?.type !== 'saveAsset' || pending.layoutId !== layoutId) return;

        const completeOAuthSave = async () => {
            try {
                const redirectUri = `${window.location.origin}${pending.returnPath || window.location.pathname}`;
                const exchange = await axios.post(
                    `${API_URL}/sketchfab/oauth/exchange`,
                    { code, redirectUri },
                    { headers: { Authorization: `Bearer ${getAuthToken()}` } }
                );
                setSketchfabTokens({
                    accessToken: exchange.data.accessToken,
                    refreshToken: exchange.data.refreshToken,
                    expiresIn: exchange.data.expiresIn,
                });

                await axios.post(
                    `${API_URL}/sketchfab/save`,
                    {
                        modelUid: pending.model.uid,
                        modelName: pending.model.name,
                        sketchfabToken: exchange.data.accessToken,
                        thumbnailUrl: pending.model.thumbnailUrl,
                    },
                    { headers: { Authorization: `Bearer ${getAuthToken()}` } }
                );

                setAssetLibraryInitialTab('saved');
                setShowAssetLibraryModal(true);
                setAssetError('');
            } catch (error) {
                console.error('Sketchfab save after OAuth failed:', error);
                setAssetError(error.response?.data?.error || 'Failed to save Sketchfab model.');
            } finally {
                clearPendingSketchfabAction();
                searchParams.delete('code');
                searchParams.delete('state');
                setSearchParams(searchParams, { replace: true });
            }
        };

        completeOAuthSave();
    }, [searchParams, setSearchParams, layoutId]);

    const registerAssetInLibrary = async (assetUrl, name, source = 'url') => {
        try {
            const token = getAuthToken();
            await axios.post(
                `${API_URL}/user-assets`,
                { assetUrl: normalizeAssetUrl(assetUrl), name, source },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.warn('Could not register asset in library:', error);
        }
    };

    const resolveObjectsForPersist = useCallback((sourceObjects, dimensionsOverride = null) => {
        const flushedDimensions = dimensionsOverride
            ?? dimensionsFieldsRef.current?.flush?.(false)
            ?? layoutDimensions;
        const normalizedDimensions = normalizeLayoutDimensions(flushedDimensions);
        const prev = prevDimensionsRef.current;
        const meshSyncedObjects = flushSceneTransformsRef.current?.(sourceObjects) ?? sourceObjects;
        const objectsToSave =
            prev.width !== normalizedDimensions.width || prev.depth !== normalizedDimensions.depth
                ? rescaleLayoutObjects(meshSyncedObjects, prev, normalizedDimensions)
                : meshSyncedObjects;

        prevDimensionsRef.current = normalizedDimensions;
        setLayoutDimensions(normalizedDimensions);
        setObjectsWithoutHistory(objectsToSave);
        dimensionsFieldsRef.current?.clearDraft?.();

        return { objectsToSave, normalizedDimensions };
    }, [layoutDimensions, setObjectsWithoutHistory]);

    const handleSaveClick = async () => {
        if (!layoutName.trim()) {
            setLayoutError('Layout name is required before saving.');
            return;
        }
        setLayoutError('');

        try {
            const token = getAuthToken();
            const { objectsToSave, normalizedDimensions } = resolveObjectsForPersist(objects);

            const serializedObjects = serializeObjectsForSave(objectsToSave);
            await axios.put(`${API_URL}/layouts/${layoutId}`, {
                objects: serializedObjects,
                name: layoutName.trim(),
                sceneSettings: serializeSceneSettings(sceneSettings),
                layoutDimensions: serializeLayoutDimensions(normalizedDimensions),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            try {
                await uploadLayoutThumbnailCapture(thumbnailCaptureRef, layoutId, token);
            } catch (thumbnailError) {
                console.warn('Layout thumbnail upload failed:', thumbnailError);
            }

            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            navigate(`/layout/${layoutId}`, {
                state: {
                    objects: serializedObjects,
                    name: layoutName.trim(),
                    sceneSettings: serializeSceneSettings(sceneSettings),
                    layoutDimensions: serializeLayoutDimensions(normalizedDimensions),
                },
            });
        } catch (error) {
            console.error('Error saving layout:', error);
            setLayoutError(error.response?.data?.error || 'Failed to save layout.');
        }
    };

    const handleEndEditing = () => {
        const { objectsToSave, normalizedDimensions } = resolveObjectsForPersist(objects);

        navigate(`/layout/${layoutId}`, {
            state: {
                objects: serializeObjectsForSave(objectsToSave),
                name: layoutName.trim(),
                sceneSettings: serializeSceneSettings(sceneSettings),
                layoutDimensions: serializeLayoutDimensions(normalizedDimensions),
            },
        });
    };

    const handleLayoutDimensionsChange = useCallback((nextRaw) => {
        const next = normalizeLayoutDimensions(nextRaw);
        const prev = prevDimensionsRef.current;

        if (prev.width !== next.width || prev.depth !== next.depth) {
            setObjects((current) => rescaleLayoutObjects(current, prev, next));
        }

        prevDimensionsRef.current = next;
        setLayoutDimensions(next);
    }, [setObjects]);

    const handleFloorplanDimensionsChange = useCallback((nextRaw) => {
        const next = normalizeLayoutDimensions(nextRaw);
        setLayoutDimensions(next);
    }, []);

    const uploadAssetFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthToken();
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

    const addAssetObject = (assetUrl, selectAfter = true, assetName = '', sketchfabCredit = null) => {
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

        if (sketchfabCredit) {
            newShape.sketchfabCredit = sketchfabCredit;
        }

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
        addAssetObject(asset.assetUrl, true, asset.name, asset.sketchfabCredit);
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
            sketchfabCredit: selectedObject.sketchfabCredit ?? null,
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
        setSelectedObject((prev) => (
            prev && String(prev.id) === String(selectedObject.id)
                ? { ...prev, [property]: value }
                : prev
        ));
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
        setSelectedObject((prev) => (
            prev && String(prev.id) === String(selectedObject.id)
                ? { ...prev, ...patch }
                : prev
        ));
    };

    const handleRotateQuarterTurn = () => {
        if (!activeObject) return;
        applyObjectPatch({ rotation: rotateObjectY(activeObject) });
    };

    const handleOrientToWall = (wall) => {
        if (!activeObject) return;
        applyObjectPatch(orientObjectToWall(activeObject, wall, layoutDimensions));
    };

    const handleRecenterObject = () => {
        if (!activeObject) return;
        applyObjectPatch({ position: [0, 0.5, 0] });
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

    const handleNewAssetFile = async (file) => {
        if (!file) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const data = await uploadAssetFile(file);
            const baseName = file.name.replace(/\.(glb|gltf)$/i, '');
            addAssetObject(data.url, true, baseName);
            setShowAssetLibraryModal(false);
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
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
        setShowAssetLibraryModal(false);
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

    const editorCameraPosition = useMemo(
        () => getEditorCameraPosition(layoutDimensions),
        [layoutDimensions],
    );

    return (
        <AssetLoadStateProvider>
        <div className="app-shell edit-layout-container">
            {showSuccessMessage && <div className="success-message">Layout saved successfully!</div>}
            <Menu />
            <div className="app-main">
                <header className="app-toolbar">
                    <div className="toolbar-title">
                        {layoutName.trim() || 'Layout'} <span>Edit</span>
                        {layoutRole && layoutRole !== 'owner' && (
                            <span className={`layout-role-badge ${layoutRole}`}>{layoutRole}</span>
                        )}
                    </div>
                    <div className="toolbar-actions">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleUndo}
                            disabled={!canUndo}
                            title="Undo (Ctrl+Z)"
                        >
                            Undo
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleRedo}
                            disabled={!canRedo}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            Redo
                        </button>
                        {layoutRole === 'owner' && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowShareModal(true)}
                            >
                                Share
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={handleSaveClick}>Save Layout</button>
                        <button className="btn btn-directional btn-sm" onClick={handleEndEditing}>Exit</button>
                    </div>
                </header>
                <div className="edit-layout-body">
                    <div className={`side-panel-shell${sidePanelCollapsed ? ' is-collapsed' : ''}`}>
                        <EditLayoutSidePanel
                            layoutName={layoutName}
                            onLayoutNameChange={(value) => {
                                setLayoutName(value);
                                setLayoutError('');
                            }}
                            layoutError={layoutError}
                            shapeType={shapeType}
                            onShapeTypeChange={setShapeType}
                            onAddShape={addShape}
                            onOpenAssetLibrary={() => {
                                setAssetLibraryInitialTab('import');
                                setShowAssetLibraryModal(true);
                            }}
                            layoutDimensions={layoutDimensions}
                            onLayoutDimensionsChange={handleLayoutDimensionsChange}
                            onFloorplanDimensionsChange={handleFloorplanDimensionsChange}
                            dimensionsFieldsRef={dimensionsFieldsRef}
                            orbitControlsRef={orbitControlsRef}
                            activeObject={activeObject}
                            onOpenSceneSettings={() => setShowSceneSettingsModal(true)}
                            objects={objects}
                            onSelectObject={setSelectedObject}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            onSave={handleSaveClick}
                            onExit={handleEndEditing}
                        />
                    </div>
                    <button
                        type="button"
                        className={`side-panel-tab${sidePanelCollapsed ? ' is-collapsed' : ''}`}
                        onClick={() => setSidePanelCollapsed((prev) => !prev)}
                        aria-expanded={!sidePanelCollapsed}
                        aria-label={sidePanelCollapsed ? 'Show side panel' : 'Hide side panel'}
                        title={sidePanelCollapsed ? 'Show panel' : 'Hide panel'}
                    >
                        <span className="side-panel-tab-icon" aria-hidden="true" />
                    </button>
                    <div className="canvas-container">
                        {activeObject && (
                            <EditObjectPanel
                                object={activeObject}
                                objects={objects}
                                transformMode={transformMode}
                                onTransformModeChange={setTransformMode}
                                onUpdate={updateSelectedObject}
                                onRotateQuarterTurn={handleRotateQuarterTurn}
                                onOrientToWall={handleOrientToWall}
                                onRecenter={handleRecenterObject}
                                onDuplicate={duplicateSelectedShape}
                                onRemove={removeSelectedShape}
                                onDeselect={() => setSelectedObject(null)}
                                uploadingAsset={uploadingAsset}
                                assetError={assetError}
                                replaceAssetInputRef={replaceAssetInputRef}
                                convertAssetInputRef={convertAssetInputRef}
                                onReplaceAssetFile={handleReplaceAssetFile}
                            />
                        )}
                        <Canvas
                            key={`edit-${layoutId}-${layoutDimensions.width}-${layoutDimensions.depth}-${layoutDimensions.roomShape}`}
                            shadows
                            camera={{ position: editorCameraPosition, fov: 75 }}
                            gl={{
                                preserveDrawingBuffer: false,
                                powerPreference: 'high-performance',
                                logarithmicDepthBuffer: true,
                            }}
                            onPointerMissed={() => {
                                if (!transformDragRef.current) {
                                    setSelectedObject(null);
                                }
                            }}
                        >
                            <Scene
                                objects={objects}
                                setObjects={setObjects}
                                setObjectsWithoutHistory={setObjectsWithoutHistory}
                                selectedObject={selectedObject}
                                setSelectedObject={setSelectedObject}
                                orbitControlsRef={orbitControlsRef}
                                transformControlsRef={transformControlsRef}
                                transformDragRef={transformDragRef}
                                transformMode={transformMode}
                                sceneSettings={sceneSettings}
                                layoutDimensions={layoutDimensions}
                                flushTransformsRef={flushSceneTransformsRef}
                            />
                        </Canvas>
                    </div>
                </div>
            </div>
            <AssetLibraryModal
                isOpen={showAssetLibraryModal}
                initialTab={assetLibraryInitialTab}
                onClose={() => {
                    setShowAssetLibraryModal(false);
                    setAssetLibraryInitialTab('import');
                    setAssetError('');
                }}
                layoutId={layoutId}
                onAddAsset={handleAddFromLibrary}
                onImportFile={handleNewAssetFile}
                onImportUrl={handleAddAssetFromUrl}
                uploading={uploadingAsset}
                importError={assetError}
                pendingUrl={pendingAssetUrl}
                onPendingUrlChange={(value) => {
                    setPendingAssetUrl(value);
                    setAssetError('');
                }}
            />
            <ShareLayoutModal
                isOpen={showShareModal}
                layoutId={layoutId}
                onClose={() => setShowShareModal(false)}
            />
            <SceneSettingsModal
                isOpen={showSceneSettingsModal}
                settings={sceneSettings}
                onChange={setSceneSettings}
                onClose={() => setShowSceneSettingsModal(false)}
            />
            <div className="layout-thumbnail-capture-host" aria-hidden="true">
                <LayoutThumbnail
                    ref={thumbnailCaptureRef}
                    objects={objects}
                    sceneSettings={sceneSettings}
                    layoutDimensions={layoutDimensions}
                    forceRender
                />
            </div>
        </div>
        </AssetLoadStateProvider>
    );
}

function Scene({
    objects,
    setObjects,
    setObjectsWithoutHistory,
    selectedObject,
    setSelectedObject,
    orbitControlsRef,
    transformControlsRef,
    transformDragRef,
    transformMode,
    sceneSettings,
    layoutDimensions,
    flushTransformsRef,
}) {
    const meshRefs = useRef({});
    const edgeDragStartRef = useRef(null);
    const edgePreviewRef = useRef(null);
    const activeObjectRef = useRef(null);
    const [meshRegistryVersion, setMeshRegistryVersion] = useState(0);
    const orbitLimits = useMemo(
        () => getEditorOrbitLimits(layoutDimensions),
        [layoutDimensions],
    );

    useEffect(() => {
        edgeDragStartRef.current = null;
        edgePreviewRef.current = null;
    }, [
        selectedObject?.id,
        transformMode,
    ]);

    const activeObject = useMemo(() => {
        if (!selectedObject) return null;
        return objects.find((obj) => String(obj.id) === String(selectedObject.id)) ?? selectedObject;
    }, [objects, selectedObject]);

    activeObjectRef.current = activeObject;

    const registerMesh = useCallback((id, mesh) => {
        if (mesh) {
            meshRefs.current[id] = mesh;
        } else {
            delete meshRefs.current[id];
        }
        setMeshRegistryVersion((version) => version + 1);
    }, []);

    useEffect(() => {
        if (!flushTransformsRef) return undefined;
        flushTransformsRef.current = (sourceObjects) => (
            applyMeshTransformsToObjects(
                sourceObjects,
                meshRefs.current,
                transformMode,
                selectedObject?.id ?? null,
            )
        );
        return () => {
            flushTransformsRef.current = null;
        };
    }, [flushTransformsRef, transformMode, selectedObject?.id]);

    const handleObjectChange = useCallback(() => {
        if (!selectedObject) return;
        const mesh = meshRefs.current[selectedObject.id]
            ?? meshRefs.current[String(selectedObject.id)];
        if (!mesh) return;

        const objectId = String(selectedObject.id);

        setObjects((prev) => {
            const updated = prev.map((obj) => {
                if (String(obj.id) !== objectId) return obj;
                return {
                    ...obj,
                    ...readObjectTransformFromMesh(obj, mesh, transformMode),
                };
            });
            return updated;
        });

        setSelectedObject((prev) => {
            if (!prev || String(prev.id) !== objectId) return prev;
            const meshForSync = meshRefs.current[prev.id] ?? meshRefs.current[String(prev.id)];
            if (!meshForSync) return prev;
            return {
                ...prev,
                ...readObjectTransformFromMesh(prev, meshForSync, transformMode),
            };
        });
    }, [selectedObject, setObjects, setSelectedObject, transformMode]);

    const finishTransformDrag = useCallback(() => {
        handleObjectChange();
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
        }
        requestAnimationFrame(() => {
            window.setTimeout(() => {
                transformDragRef.current = false;
            }, 250);
        });
    }, [handleObjectChange, orbitControlsRef, transformDragRef]);

    const handleEdgeDragStart = useCallback(() => {
        const object = activeObjectRef.current;
        if (!object) return;
        edgeDragStartRef.current = {
            objectId: String(object.id),
            size: [...(object.size || [1, 1, 1])],
            position: [...object.position],
        };
        edgePreviewRef.current = null;
        transformDragRef.current = true;
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
        }
    }, [orbitControlsRef, transformDragRef]);

    const handleEdgePreview = useCallback((updates) => {
        const start = edgeDragStartRef.current;
        const objectId = start?.objectId
            ?? (activeObjectRef.current ? String(activeObjectRef.current.id) : null);
        if (!objectId) return;

        edgePreviewRef.current = updates;
        setObjectsWithoutHistory((prev) => prev.map((obj) => (
            String(obj.id) === objectId
                ? { ...obj, size: updates.size, position: updates.position }
                : obj
        )));
        setSelectedObject((prev) => (
            prev && String(prev.id) === objectId
                ? { ...prev, size: updates.size, position: updates.position }
                : prev
        ));
    }, [setObjectsWithoutHistory, setSelectedObject]);

    const handleEdgeCommit = useCallback(() => {
        const object = activeObjectRef.current;
        const objectId = object ? String(object.id) : null;
        const updates = edgePreviewRef.current;
        const start = edgeDragStartRef.current;

        if (updates && start && objectId) {
            flushSync(() => {
                setObjectsWithoutHistory((prev) => prev.map((obj) => (
                    String(obj.id) === objectId
                        ? { ...obj, size: [...start.size], position: [...start.position] }
                        : obj
                )));
            });
            setObjects((prev) => prev.map((obj) => (
                String(obj.id) === objectId
                    ? { ...obj, size: updates.size, position: updates.position }
                    : obj
            )));
            setSelectedObject((prev) => (
                prev && String(prev.id) === objectId
                    ? { ...prev, size: updates.size, position: updates.position }
                    : prev
            ));
        }

        edgeDragStartRef.current = null;
        edgePreviewRef.current = null;

        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
        }
        requestAnimationFrame(() => {
            window.setTimeout(() => {
                transformDragRef.current = false;
            }, 250);
        });
    }, [orbitControlsRef, setObjects, setObjectsWithoutHistory, setSelectedObject, transformDragRef]);

    const selectedMesh = useMemo(() => {
        if (!activeObject) return null;
        return meshRefs.current[activeObject.id] ?? meshRefs.current[String(activeObject.id)] ?? null;
    }, [activeObject, meshRegistryVersion]);
    const useEdgeResize = Boolean(
        activeObject
        && transformMode === 'scale'
        && isBoxEdgeResizableType(activeObject.type),
    );
    const useTransformControls = Boolean(selectedMesh && !useEdgeResize);
    const edgeResizeTargetId = useEdgeResize && activeObject ? String(activeObject.id) : null;

    return (
        <>
            <LayoutSceneEnvironment
                settings={sceneSettings}
                dimensions={layoutDimensions}
                ignoreRaycast={Boolean(edgeResizeTargetId)}
            />
            {objects.map((object) => (
                <Shape
                    key={object.id}
                    object={object}
                    onSelect={setSelectedObject}
                    registerMesh={registerMesh}
                    resizeActive={edgeResizeTargetId === String(object.id)}
                    resizeSnap={GRID_SNAP}
                    onResizePreview={handleEdgePreview}
                    onResizeCommit={handleEdgeCommit}
                    onResizeDragStart={handleEdgeDragStart}
                />
            ))}
            <OrbitControls
                ref={orbitControlsRef}
                makeDefault
                enableRotate={!selectedObject}
                enablePan={!selectedObject}
                enableZoom
                minDistance={orbitLimits.minDistance}
                maxDistance={orbitLimits.maxDistance}
                maxPolarAngle={Math.PI / 2 - 0.04}
                target={[0, 0, 0]}
            />
            {useTransformControls && (
                <TransformControls
                    ref={transformControlsRef}
                    object={selectedMesh}
                    mode={transformMode}
                    translationSnap={GRID_SNAP}
                    rotationSnap={Math.PI / 12}
                    scaleSnap={GRID_SNAP}
                    onMouseDown={() => {
                        transformDragRef.current = true;
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                    }}
                    onMouseUp={finishTransformDrag}
                />
            )}
        </>
    );
}

function Shape({
    object,
    onSelect,
    registerMesh,
    resizeActive = false,
    resizeSnap,
    onResizePreview,
    onResizeCommit,
    onResizeDragStart,
}) {
    if (object.type === 'asset') {
        const rawOpacity = object.opacity ?? 1;
        const isOpaque = rawOpacity >= 0.995;
        const opacity = isOpaque ? 1 : rawOpacity;

        return (
            <>
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
                {object.sketchfabCredit && (
                    <SketchfabAssetCredit
                        credit={object.sketchfabCredit}
                        position={object.position}
                        size={object.size || [1, 1, 1]}
                    />
                )}
            </>
        );
    }

    return (
        <PrimitiveShape
            object={object}
            onSelect={onSelect}
            registerMesh={registerMesh}
            resizeActive={resizeActive}
            resizeSnap={resizeSnap}
            onResizePreview={onResizePreview}
            onResizeCommit={onResizeCommit}
            onResizeDragStart={onResizeDragStart}
        />
    );
}

function PrimitiveShape({
    object,
    onSelect,
    registerMesh,
    resizeActive = false,
    resizeSnap,
    onResizePreview,
    onResizeCommit,
    onResizeDragStart,
}) {
    const groupRef = useRef();
    const meshRef = useRef();
    const { type, position, rotation = [0, 0, 0], color, size } = object;
    const rawOpacity = object.opacity ?? 1;
    const isOpaque = rawOpacity >= 0.995;
    const opacity = isOpaque ? 1 : rawOpacity;

    useEffect(() => {
        if (groupRef.current) {
            registerMesh(object.id, groupRef.current);
        }
        return () => registerMesh(object.id, null);
    }, [object.id, registerMesh]);

    useLayoutEffect(() => {
        if (groupRef.current) {
            groupRef.current.scale.set(1, 1, 1);
        }
    }, [size]);

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

    const isBox = type === 'cube' || type === 'rectangle';

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            <mesh
                ref={meshRef}
                raycast={resizeActive ? () => null : undefined}
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
            {resizeActive && isBox && (
                <BoxEdgeResizeHandles
                    size={size}
                    snap={resizeSnap}
                    onPreview={onResizePreview}
                    onCommit={onResizeCommit}
                    onDragStart={onResizeDragStart}
                />
            )}
        </group>
    );
}

export default EditLayout;
