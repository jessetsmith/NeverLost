import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import SavedAssetsGrid from './SavedAssetsGrid';
import { API_URL } from '../config/api';
import {
    getSketchfabToken,
    setSketchfabTokens,
    clearSketchfabTokens,
    isSketchfabConnected,
    getSketchfabRedirectUri,
    setPendingSketchfabAction,
    getPendingSketchfabAction,
    clearPendingSketchfabAction,
} from '../utils/sketchfabAuth';
import { isValidAssetUrl, normalizeAssetUrl } from '../utils/assetUrls';
import { flattenEditableLayouts } from '../utils/layoutList';
import './Library.css';

function Library() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('saved');
    const [query, setQuery] = useState('furniture');
    const [models, setModels] = useState([]);
    const [savedAssets, setSavedAssets] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [layouts, setLayouts] = useState([]);
    const [selectedLayoutId, setSelectedLayoutId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [importingUid, setImportingUid] = useState(null);
    const [addingAssetId, setAddingAssetId] = useState(null);
    const [savingAssetId, setSavingAssetId] = useState(null);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [sketchfabConnected, setSketchfabConnected] = useState(isSketchfabConnected());
    const [serviceStatus, setServiceStatus] = useState({ searchConfigured: false, oauthConfigured: false });
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [pendingAssetUrl, setPendingAssetUrl] = useState('');
    const uploadInputRef = useRef(null);

    const authHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    }, []);

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

    const fetchSavedAssets = useCallback(async () => {
        setLoadingSaved(true);
        try {
            const response = await axios.get(`${API_URL}/user-assets`, {
                headers: authHeaders(),
            });
            setSavedAssets(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching saved assets:', err);
        } finally {
            setLoadingSaved(false);
        }
    }, [authHeaders]);

    const fetchLayouts = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/layouts`, { headers: authHeaders() });
            const data = flattenEditableLayouts(response.data);
            setLayouts(data);
            if (data.length > 0) {
                setSelectedLayoutId((current) => current || data[0]._id);
            }
        } catch (err) {
            console.error('Error fetching layouts:', err);
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
            setError(err.response?.data?.error || 'Failed to search Sketchfab models.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [authHeaders]);

    const startSketchfabOAuth = useCallback(async (pendingAction = null) => {
        setError('');
        if (pendingAction) {
            setPendingSketchfabAction(pendingAction);
        }

        try {
            const redirectUri = getSketchfabRedirectUri();
            const response = await axios.get(`${API_URL}/sketchfab/oauth/url`, {
                headers: authHeaders(),
                params: { redirectUri },
            });
            window.location.href = response.data.url;
        } catch (err) {
            clearPendingSketchfabAction();
            setError(err.response?.data?.error || 'Could not start Sketchfab sign-in.');
        }
    }, [authHeaders]);

    const runSketchfabImport = useCallback(async (model, saveOnly = false, layoutId = selectedLayoutId) => {
        const sketchfabToken = getSketchfabToken();
        if (!sketchfabToken) {
            await startSketchfabOAuth({
                type: saveOnly ? 'save' : 'import',
                model: {
                    uid: model.uid,
                    name: model.name,
                    thumbnailUrl: model.thumbnailUrl,
                },
                saveOnly,
                layoutId: saveOnly ? null : layoutId,
                query,
                tab: 'sketchfab',
            });
            return;
        }

        if (!saveOnly && !layoutId) {
            setError('Select a layout to add this model to.');
            return;
        }

        setImportingUid(model.uid);
        setError('');
        setStatusMessage('');

        try {
            if (saveOnly) {
                await axios.post(
                    `${API_URL}/sketchfab/save`,
                    {
                        modelUid: model.uid,
                        modelName: model.name,
                        sketchfabToken,
                        thumbnailUrl: model.thumbnailUrl,
                    },
                    { headers: authHeaders() }
                );
                setStatusMessage(`"${model.name}" saved to your library.`);
            } else {
                await axios.post(
                    `${API_URL}/sketchfab/import/${layoutId}`,
                    {
                        modelUid: model.uid,
                        modelName: model.name,
                        sketchfabToken,
                        thumbnailUrl: model.thumbnailUrl,
                    },
                    { headers: authHeaders() }
                );
                setStatusMessage(`"${model.name}" saved and added to your layout.`);
            }
            await fetchSavedAssets();
        } catch (err) {
            setError(err.response?.data?.error || `Failed to import "${model.name}".`);
        } finally {
            setImportingUid(null);
        }
    }, [authHeaders, fetchSavedAssets, query, selectedLayoutId, startSketchfabOAuth]);

    useEffect(() => {
        fetchServiceStatus();
        fetchLayouts();
        fetchSavedAssets();
        searchModels('furniture');
    }, [fetchServiceStatus, fetchLayouts, fetchSavedAssets, searchModels]);

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) return;

        const exchangeCode = async () => {
            try {
                const redirectUri = getSketchfabRedirectUri();
                const response = await axios.post(
                    `${API_URL}/sketchfab/oauth/exchange`,
                    { code, redirectUri },
                    { headers: authHeaders() }
                );
                setSketchfabTokens({
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken,
                });
                setSketchfabConnected(true);
                setStatusMessage('Sketchfab account connected. Finishing your download…');

                const pending = getPendingSketchfabAction();
                clearPendingSketchfabAction();
                searchParams.delete('code');
                searchParams.delete('state');
                setSearchParams(searchParams, { replace: true });

                if (pending?.model) {
                    if (pending.query) setQuery(pending.query);
                    if (pending.tab) setActiveTab(pending.tab);
                    if (pending.layoutId) setSelectedLayoutId(pending.layoutId);
                    await runSketchfabImport(pending.model, pending.saveOnly, pending.layoutId);
                } else {
                    setStatusMessage('Sketchfab account connected.');
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to connect Sketchfab account.');
                searchParams.delete('code');
                searchParams.delete('state');
                setSearchParams(searchParams, { replace: true });
                clearPendingSketchfabAction();
            }
        };

        exchangeCode();
    }, [searchParams, setSearchParams, authHeaders, runSketchfabImport]);

    const handleConnectSketchfab = () => {
        if (!serviceStatus.oauthConfigured) {
            setError('Sketchfab downloads are not available yet. The server needs SKETCHFAB_CLIENT_ID and SKETCHFAB_CLIENT_SECRET configured.');
            return;
        }
        startSketchfabOAuth({
            tab: activeTab,
            query,
            layoutId: selectedLayoutId,
        });
    };

    const handleDisconnectSketchfab = () => {
        clearSketchfabTokens();
        setSketchfabConnected(false);
        setStatusMessage('Sketchfab account disconnected.');
    };

    const handleSearch = (event) => {
        event.preventDefault();
        searchModels(query.trim());
    };

    useEffect(() => {
        if (activeTab === 'saved') {
            fetchSavedAssets();
        }
    }, [activeTab, fetchSavedAssets]);

    const handleUploadToLibrary = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingAsset(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`${API_URL}/assets/upload`, formData, {
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.userAsset) {
                setSavedAssets((prev) => {
                    const exists = prev.some((item) => item._id === response.data.userAsset._id);
                    return exists ? prev : [response.data.userAsset, ...prev];
                });
            } else {
                await fetchSavedAssets();
            }
            setStatusMessage(`"${file.name.replace(/\.(glb|gltf)$/i, '')}" added to your library.`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload asset.');
        } finally {
            setUploadingAsset(false);
            event.target.value = '';
        }
    };

    const handleAddUrlToLibrary = async () => {
        if (!isValidAssetUrl(pendingAssetUrl)) {
            setError('Paste a direct .glb/.gltf URL or a Google Drive share link.');
            return;
        }

        setUploadingAsset(true);
        setError('');
        try {
            const normalized = normalizeAssetUrl(pendingAssetUrl);
            const response = await axios.post(
                `${API_URL}/user-assets`,
                {
                    name: 'Imported Asset',
                    assetUrl: normalized,
                    source: 'url',
                },
                { headers: authHeaders() }
            );
            setSavedAssets((prev) => {
                const exists = prev.some((item) => item._id === response.data._id);
                return exists ? prev : [response.data, ...prev];
            });
            setPendingAssetUrl('');
            setStatusMessage('Asset URL saved to your library.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save asset URL.');
        } finally {
            setUploadingAsset(false);
        }
    };

    const handleAddSavedToLayout = async (asset) => {
        if (!selectedLayoutId) {
            setError('Select a layout to add this asset to.');
            return;
        }

        setAddingAssetId(asset._id);
        setError('');
        setStatusMessage('');

        try {
            await axios.post(
                `${API_URL}/user-assets/${asset._id}/add-to-layout/${selectedLayoutId}`,
                {},
                { headers: authHeaders() }
            );
            setStatusMessage(`"${asset.name}" added to your layout.`);
        } catch (err) {
            setError(err.response?.data?.error || `Failed to add "${asset.name}" to layout.`);
        } finally {
            setAddingAssetId(null);
        }
    };

    const handleRenameSavedAsset = async (asset, name) => {
        setSavingAssetId(asset._id);
        setError('');
        try {
            const response = await axios.put(
                `${API_URL}/user-assets/${asset._id}`,
                { name },
                { headers: authHeaders() }
            );
            setSavedAssets((prev) =>
                prev.map((item) => (item._id === asset._id ? response.data : item))
            );
            setStatusMessage(`Renamed to "${response.data.name}".`);
        } catch (err) {
            const status = err.response?.status;
            let message = err.response?.data?.error;
            if (!message && status === 404) {
                message = 'Rename route not found — restart the backend server (npm start).';
            }
            setError(message || 'Failed to rename asset.');
            throw err;
        } finally {
            setSavingAssetId(null);
        }
    };

    const handleRemoveSavedAsset = async (asset) => {
        if (!window.confirm(`Remove "${asset.name}" from your library?`)) return;

        try {
            await axios.delete(`${API_URL}/user-assets/${asset._id}`, {
                headers: authHeaders(),
            });
            setSavedAssets((prev) => prev.filter((item) => item._id !== asset._id));
            setStatusMessage(`"${asset.name}" removed from your library.`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to remove asset.');
        }
    };

    const handleImport = async (model, saveOnly = false) => {
        if (!serviceStatus.oauthConfigured) {
            setError('Sketchfab downloads are not available yet. The server needs SKETCHFAB_CLIENT_ID and SKETCHFAB_CLIENT_SECRET configured.');
            return;
        }

        if (!saveOnly && !selectedLayoutId) {
            setError('Select a layout to add this model to.');
            return;
        }

        await runSketchfabImport(model, saveOnly, selectedLayoutId);
    };

    return (
        <div className="app-shell library-container">
            <Menu />
            <div className="app-main">
                <header className="page-header library-header">
                    <div>
                        <h2>Asset <span>Library</span></h2>
                        <p className="library-subtitle">
                            Browse your saved 3D assets or search Sketchfab for free downloadable models.
                        </p>
                    </div>
                    {activeTab === 'sketchfab' && (
                        <div className="library-header-actions">
                            {sketchfabConnected ? (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={handleDisconnectSketchfab}>
                                    Disconnect Sketchfab
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-accent btn-sm"
                                    onClick={handleConnectSketchfab}
                                    disabled={!serviceStatus.oauthConfigured}
                                >
                                    Sign in with Sketchfab
                                </button>
                            )}
                        </div>
                    )}
                </header>

                <div className="library-content">
                    <div className="library-tabs">
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

                    {statusMessage && <p className="library-success">{statusMessage}</p>}
                    {error && <p className="error-message">{error}</p>}

                    <div className="library-toolbar">
                        <div className="library-layout-picker">
                            <label htmlFor="layout-select">Add to layout</label>
                            <select
                                id="layout-select"
                                value={selectedLayoutId}
                                onChange={(e) => setSelectedLayoutId(e.target.value)}
                            >
                                {layouts.length === 0 ? (
                                    <option value="">No layouts yet</option>
                                ) : (
                                    layouts.map((layout) => (
                                        <option key={layout._id} value={layout._id}>
                                            {layout.name}
                                        </option>
                                    ))
                                )}
                            </select>
                            {selectedLayoutId && (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => navigate(`/layout/${selectedLayoutId}/edit`)}
                                >
                                    Open layout
                                </button>
                            )}
                        </div>
                    </div>

                    {activeTab === 'saved' ? (
                        <>
                            <div className="library-upload-panel">
                                <h3 className="library-upload-heading">Upload to Library</h3>
                                <p className="panel-subhint">
                                    Upload GLB/GLTF files or paste a URL. These appear here and in the layout editor under From Library.
                                </p>
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                                    hidden
                                    disabled={uploadingAsset}
                                    onChange={handleUploadToLibrary}
                                />
                                <div className="library-upload-actions">
                                    <button
                                        type="button"
                                        className="btn btn-accent btn-sm"
                                        disabled={uploadingAsset}
                                        onClick={() => uploadInputRef.current?.click()}
                                    >
                                        {uploadingAsset ? 'Uploading…' : 'Choose GLB / GLTF File'}
                                    </button>
                                    <div className="library-upload-url">
                                        <input
                                            type="url"
                                            value={pendingAssetUrl}
                                            placeholder="Or paste cloud URL…"
                                            disabled={uploadingAsset}
                                            onChange={(e) => {
                                                setPendingAssetUrl(e.target.value);
                                                setError('');
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={uploadingAsset || !isValidAssetUrl(pendingAssetUrl)}
                                            onClick={handleAddUrlToLibrary}
                                        >
                                            Save URL
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <SavedAssetsGrid
                                assets={savedAssets}
                                loading={loadingSaved}
                                addingId={addingAssetId}
                                savingId={savingAssetId}
                                onAddToLayout={handleAddSavedToLayout}
                                onRename={handleRenameSavedAsset}
                                onDelete={handleRemoveSavedAsset}
                                showAddButton
                                showEditButton
                                showDeleteButton
                                emptyMessage="No saved assets yet. Upload a file above or download models from the Sketchfab tab."
                            />
                        </>
                    ) : (
                        <>
                            {!serviceStatus.searchConfigured && (
                                <p className="library-notice">
                                    Sketchfab search is not configured. Add SKETCHFAB_API_TOKEN to the server environment.
                                </p>
                            )}

                            {!serviceStatus.oauthConfigured && (
                                <div className="library-notice library-notice-warning">
                                    <strong>Downloads are unavailable.</strong> Saving models requires Sketchfab OAuth on the server.
                                    Add <code>SKETCHFAB_CLIENT_ID</code> and <code>SKETCHFAB_CLIENT_SECRET</code> to the server{' '}
                                    <code>.env</code> file, then restart the backend. Register an OAuth app at{' '}
                                    <a href="https://sketchfab.com/settings/password" target="_blank" rel="noreferrer">
                                        sketchfab.com/settings/password
                                    </a>{' '}
                                    with redirect URI <code>http://localhost:5173/library</code>.
                                </div>
                            )}

                            {serviceStatus.oauthConfigured && !sketchfabConnected && (
                                <div className="library-notice library-notice-action">
                                    <strong>Sign in to save models.</strong> Click <em>Save to Library</em> or{' '}
                                    <em>Save &amp; Add to Layout</em> on any model and you&apos;ll be redirected to Sketchfab
                                    to sign in. After login, your download will continue automatically.
                                </div>
                            )}

                            <form className="library-search-form library-search-form-inline" onSubmit={handleSearch}>
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search chairs, desks, plants…"
                                />
                                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                                    Search
                                </button>
                            </form>

                            {loading ? (
                                <p className="loading-state">Searching Sketchfab…</p>
                            ) : (
                                <>
                                    <div className="library-grid">
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
                                                    {model.license && (
                                                        <p className="library-card-license">{model.license}</p>
                                                    )}
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
                                                            className="btn btn-ghost btn-sm"
                                                            disabled={!serviceStatus.oauthConfigured || importingUid === model.uid}
                                                            onClick={() => handleImport(model, true)}
                                                        >
                                                            {importingUid === model.uid
                                                                ? 'Saving…'
                                                                : sketchfabConnected
                                                                    ? 'Save to Library'
                                                                    : 'Sign in & Save'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm"
                                                            disabled={
                                                                !serviceStatus.oauthConfigured
                                                                || importingUid === model.uid
                                                                || (sketchfabConnected && !selectedLayoutId)
                                                            }
                                                            onClick={() => handleImport(model, false)}
                                                        >
                                                            {importingUid === model.uid
                                                                ? 'Importing…'
                                                                : sketchfabConnected
                                                                    ? 'Save & Add to Layout'
                                                                    : 'Sign in & Add to Layout'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>

                                    {models.length === 0 && !loading && (
                                        <p className="panel-hint">No downloadable models found. Try a different search.</p>
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

export default Library;
