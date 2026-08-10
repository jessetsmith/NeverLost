import React, { useEffect, useState } from 'react';
import AssetThumbnail from './AssetThumbnail';

const SOURCE_LABELS = {
    upload: 'Uploaded',
    sketchfab: 'Sketchfab',
    url: 'URL',
};

function SavedAssetsGrid({
    assets,
    loading = false,
    addingId = null,
    savingId = null,
    onAddToLayout,
    onSelect,
    onRename,
    onDelete,
    highlightAssetId = null,
    showAddButton = false,
    showSelectButton = false,
    showEditButton = false,
    showDeleteButton = false,
    emptyMessage = 'No saved assets yet. Upload a model or download one from Sketchfab.',
}) {
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (!highlightAssetId) return;

        const frame = window.requestAnimationFrame(() => {
            const element = document.getElementById(`saved-asset-${highlightAssetId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [highlightAssetId, assets]);

    const startEditing = (asset) => {
        setEditingId(asset._id);
        setEditName(asset.name || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEditing = async (asset) => {
        const trimmed = editName.trim();
        if (!trimmed) return;

        if (trimmed === asset.name) {
            cancelEditing();
            return;
        }

        await onRename(asset, trimmed);
        cancelEditing();
    };

    if (loading) {
        return <p className="loading-state">Loading saved assets…</p>;
    }

    if (!assets.length) {
        return <p className="panel-hint">{emptyMessage}</p>;
    }

    return (
        <div className="library-grid saved-assets-grid">
            {assets.map((asset) => {
                const isEditing = editingId === asset._id;
                const isSaving = savingId === asset._id;

                return (
                    <article
                        key={asset._id}
                        id={`saved-asset-${asset._id}`}
                        className={`library-card saved-asset-card${
                            highlightAssetId === asset._id ? ' saved-asset-card-highlight' : ''
                        }`}
                    >
                        <div className="library-card-thumb saved-asset-thumb">
                            {asset.thumbnailUrl ? (
                                <img src={asset.thumbnailUrl} alt={asset.name} loading="lazy" />
                            ) : (
                                <AssetThumbnail assetUrl={asset.assetUrl} />
                            )}
                        </div>
                        <div className="library-card-body">
                            {isEditing ? (
                                <form
                                    className="saved-asset-edit-form"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        saveEditing(asset);
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={editName}
                                        maxLength={120}
                                        autoFocus
                                        disabled={isSaving}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                    <div className="saved-asset-edit-actions">
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            disabled={isSaving || !editName.trim()}
                                        >
                                            {isSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            disabled={isSaving}
                                            onClick={cancelEditing}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <h3>{asset.name}</h3>
                            )}
                            <p className="library-card-meta">
                                {SOURCE_LABELS[asset.source] || asset.source}
                                {asset.createdAt && (
                                    <> · {new Date(asset.createdAt).toLocaleDateString()}</>
                                )}
                            </p>
                            {!isEditing && (
                                <div className="library-card-actions">
                                    {showEditButton && onRename && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => startEditing(asset)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {showSelectButton && onSelect && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => onSelect(asset)}
                                        >
                                            Add to Layout
                                        </button>
                                    )}
                                    {showAddButton && onAddToLayout && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={addingId === asset._id}
                                            onClick={() => onAddToLayout(asset)}
                                        >
                                            {addingId === asset._id ? 'Adding…' : 'Add to Layout'}
                                        </button>
                                    )}
                                    {showDeleteButton && onDelete && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => onDelete(asset)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export default SavedAssetsGrid;
