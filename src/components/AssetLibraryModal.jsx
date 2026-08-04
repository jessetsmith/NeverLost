import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import SavedAssetsGrid from './SavedAssetsGrid';
import { API_URL } from '../config/api';
import { isValidAssetUrl } from '../utils/assetUrls';
import {
    getSketchfabToken,
    setPendingSketchfabAction,
    clearPendingSketchfabAction,
    isSketchfabConnected,
} from '../utils/sketchfabAuth';
import './AssetLibraryModal.css';
import './Library.css';
import './EditLayout.css';

function AssetLibraryModal({
    isOpen,
    onClose,
    layoutId,
    onAddAsset,
    onImportFile,
    onImportUrl,
    uploading = false,
    importError = '',
    pendingUrl = '',
    onPendingUrlChange,
}) {
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('import');
    const [savedAssets, setSavedAssets] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [query, setQuery] = useState('furniture');
    const [models, setModels] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [importingUid, setImportingUid] = useState(null);
    const [error, setError] = useState('');
    const [sketchfabConnected, setSketchfabConnected] = useState(isSketchfabConnected());
    const [serviceStatus, setServiceStatus] = useState({ searchConfigured: false, oauthConfigured: false });

    const redirectUri = `${window.location.origin}${window.location.pathname}`;

    const authHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    }, []);

    const fetchSavedAssets = useCallback(async () => {
        setLoadingSaved(true);
        try {
            const response = await axios.get(`${API_URL}/user-assets`, {
                headers: authHeaders(),
            });
            setSavedAssets(Array.isArray(response.data) ? response.data : []);
        } catch {
            setError('Failed to load saved assets.');
        } finally {
            setLoadingSaved(false);
        }
    }, [authHeaders]);

    const fetchServiceStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/sketchfab/status`, {
                headers: authHeaders(),
            });
            setServiceStatus(response.data);
        } catch {
            setServiceStatus({ searchConfigured: false, oauthConfigured: false });
        }
    }, [authHeaders]);

    const searchModels = useCallback(async (searchQuery, cursor = null, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setError('');
        }

        try {
            const params = { q: searchQuery };
            if (cursor) params.cursor = cursor;

            const response = await axios.get(`${API_URL}/sketchfab/search`, {
                headers: authHeaders(),
                params,
            });

            setModels((prev) => (append ? [...prev, ...response.data.results] : response.data.results));
            setNextCursor(response.data.nextCursor);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to search Sketchfab.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setActiveTab('import');
        fetchSavedAssets();
        fetchServiceStatus();
        searchModels('furniture');
        setSketchfabConnected(isSketchfabConnected());
    }, [isOpen, fetchSavedAssets, fetchServiceStatus, searchModels]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const startSketchfabOAuth = async (model) => {
        if (!serviceStatus.oauthConfigured) {
            setError('Sketchfab downloads require OAuth configuration on the server.');
            return;
        }

        setPendingSketchfabAction({
            type: 'editorAddAsset',
            layoutId,
            model: {
                uid: model.uid,
                name: model.name,
                thumbnailUrl: model.thumbnailUrl,
            },
            returnPath: window.location.pathname,
        });

        try {
            const response = await axios.get(`${API_URL}/sketchfab/oauth/url`, {
                headers: authHeaders(),
                params: { redirectUri },
            });
            window.location.href = response.data.url;
        } catch (err) {
            clearPendingSketchfabAction();
            setError(err.response?.data?.error || 'Could not start Sketchfab sign-in.');
        }
    };

    const saveSketchfabModel = useCallback(async (model) => {
        const sketchfabToken = getSketchfabToken();
        if (!sketchfabToken) {
            await startSketchfabOAuth(model);
            return;
        }

        setImportingUid(model.uid);
        setError('');

        try {
            const response = await axios.post(
                `${API_URL}/sketchfab/save`,
                {
                    modelUid: model.uid,
                    modelName: model.name,
                    sketchfabToken,
                    thumbnailUrl: model.thumbnailUrl,
                },
                { headers: authHeaders() }
            );

            onAddAsset({
                name: response.data.userAsset.name,
                assetUrl: response.data.userAsset.assetUrl,
            });
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || `Failed to import "${model.name}".`);
        } finally {
            setImportingUid(null);
        }
    }, [authHeaders, onAddAsset, onClose, serviceStatus.oauthConfigured]);

    const handleSearch = (event) => {
        event.preventDefault();
        searchModels(query.trim());
    };

    const handleSelectSaved = (asset) => {
        onAddAsset({ name: asset.name, assetUrl: asset.assetUrl });
        onClose();
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file && onImportFile) {
            onImportFile(file);
        }
        event.target.value = '';
    };

    const displayError = importError || error;

    if (!isOpen) return null;

    return (
        <div className="asset-library-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="asset-library-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-library-modal-title"
            >
                <header className="asset-library-modal-header">
                    <div>
                        <h2 id="asset-library-modal-title">Add Asset</h2>
                        <p className="asset-library-modal-subtitle">
                            Upload a file, paste a URL, or choose from your library and Sketchfab.
                        </p>
                    </div>
                    <button type="button" className="btn btn-directional btn-sm" onClick={onClose}>
                        Close
                    </button>
                </header>

                <div className="asset-library-modal-tabs">
                    <button
                        type="button"
                        className={`library-tab${activeTab === 'import' ? ' active' : ''}`}
                        onClick={() => setActiveTab('import')}
                    >
                        Import
                    </button>
                    <button
                        type="button"
                        className={`library-tab${activeTab === 'saved' ? ' active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        My Assets ({savedAssets.length})
                    </button>
                    <button
                        type="button"
                        className={`library-tab${activeTab === 'sketchfab' ? ' active' : ''}`}
                        onClick={() => setActiveTab('sketchfab')}
                    >
                        Sketchfab
                    </button>
                </div>

                {displayError && <p className="error-message asset-library-modal-error">{displayError}</p>}

                <div className="asset-library-modal-body">
                    {activeTab === 'import' ? (
                        <div className="asset-import-panel">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                hidden
                                disabled={uploading}
                                onChange={handleFileChange}
                            />
                            <div className="upload-dropzone">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploading ? 'Uploading…' : 'Choose GLB / GLTF File'}
                                </button>
                                <p className="panel-subhint upload-dropzone-hint">
                                    Uploads to cloud storage and adds the model to your layout. Max 25 MB.
                                    Google Drive links: paste the share URL below instead.
                                </p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="asset-modal-url">Or paste cloud URL</label>
                                <input
                                    id="asset-modal-url"
                                    type="url"
                                    value={pendingUrl}
                                    placeholder="https://cdn.example.com/model.glb"
                                    onChange={(e) => onPendingUrlChange?.(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%' }}
                                disabled={uploading || !isValidAssetUrl(pendingUrl)}
                                onClick={() => onImportUrl?.()}
                            >
                                Add from URL
                            </button>
                        </div>
                    ) : activeTab === 'saved' ? (
                        <SavedAssetsGrid
                            assets={savedAssets}
                            loading={loadingSaved}
                            onSelect={handleSelectSaved}
                            showSelectButton
                            emptyMessage="No saved assets yet. Use Import to upload a file or browse Sketchfab."
                        />
                    ) : (
                        <>
                            {!serviceStatus.searchConfigured && (
                                <p className="library-notice">
                                    Sketchfab search is not configured on the server.
                                </p>
                            )}

                            {serviceStatus.oauthConfigured && !sketchfabConnected && (
                                <p className="library-notice library-notice-action">
                                    Click <em>Add to Layout</em> on a model to sign in with Sketchfab if needed.
                                </p>
                            )}

                            <form className="library-search-form library-search-form-inline" onSubmit={handleSearch}>
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search chairs, desks, plants…"
                                />
                                <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
                                    Search
                                </button>
                            </form>

                            {loading ? (
                                <p className="loading-state">Searching Sketchfab…</p>
                            ) : (
                                <>
                                    <div className="library-grid asset-library-modal-grid">
                                        {models.map((model) => (
                                            <article key={model.uid} className="library-card">
                                                <div className="library-card-thumb">
                                                    {model.thumbnailUrl ? (
                                                        <img src={model.thumbnailUrl} alt={model.name} loading="lazy" />
                                                    ) : (
                                                        <div className="library-card-thumb-fallback" />
                                                    )}
                                                </div>
                                                <div className="library-card-body">
                                                    <h3>{model.name}</h3>
                                                    <p className="library-card-meta">by {model.author}</p>
                                                    <div className="library-card-actions library-card-actions-stack">
                                                        <a
                                                            href={model.viewerUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-ghost btn-sm"
                                                        >
                                                            Preview
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm"
                                                            disabled={!serviceStatus.oauthConfigured || importingUid === model.uid}
                                                            onClick={() => saveSketchfabModel(model)}
                                                        >
                                                            {importingUid === model.uid
                                                                ? 'Adding…'
                                                                : sketchfabConnected
                                                                    ? 'Add to Layout'
                                                                    : 'Sign in & Add'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>

                                    {models.length === 0 && !loading && (
                                        <p className="panel-hint">No models found. Try another search.</p>
                                    )}

                                    {nextCursor && (
                                        <div className="library-load-more">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                disabled={loadingMore}
                                                onClick={() => searchModels(query, nextCursor, true)}
                                            >
                                                {loadingMore ? 'Loading…' : 'Load more'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AssetLibraryModal;
