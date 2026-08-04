import React, { useEffect, useState } from 'react';
import { getObjectDisplayName } from '../utils/layoutObjects';
import './ObjectDetailsModal.css';

function emptyProperty() {
    return { key: '', value: '' };
}

function formatLogTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function ObjectDetailsModal({ isOpen, object, onClose, onSave, saving, saveError, readOnly = false }) {
    const [notes, setNotes] = useState('');
    const [properties, setProperties] = useState([emptyProperty()]);
    const [log, setLog] = useState([]);
    const [logDraft, setLogDraft] = useState('');

    useEffect(() => {
        if (!object) return;
        setNotes(object.notes ?? '');
        const existing = Array.isArray(object.properties) ? object.properties : [];
        setProperties(existing.length > 0 ? existing.map((entry) => ({ ...entry })) : [emptyProperty()]);
        setLog(Array.isArray(object.log) ? object.log.map((entry) => ({ ...entry })) : []);
        setLogDraft('');
    }, [object]);

    if (!isOpen || !object) return null;

    const displayName = getObjectDisplayName(object);
    const typeLabel = object.type === 'asset' ? '3D Asset' : object.type.charAt(0).toUpperCase() + object.type.slice(1);
    const sortedLog = [...log].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const updateProperty = (index, field, value) => {
        setProperties((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
        );
    };

    const addProperty = () => {
        setProperties((prev) => [...prev, emptyProperty()]);
    };

    const removeProperty = (index) => {
        setProperties((prev) => {
            if (prev.length <= 1) return [emptyProperty()];
            return prev.filter((_, i) => i !== index);
        });
    };

    const addLogEntry = () => {
        const message = logDraft.trim();
        if (!message) return;

        setLog((prev) => [
            ...prev,
            {
                message,
                createdAt: new Date().toISOString(),
            },
        ]);
        setLogDraft('');
    };

    const removeLogEntry = (entryToRemove) => {
        setLog((prev) =>
            prev.filter(
                (entry) =>
                    entry.createdAt !== entryToRemove.createdAt
                    || entry.message !== entryToRemove.message
            )
        );
    };

    const handleLogKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addLogEntry();
        }
    };

    const handleSave = () => {
        const cleanedProperties = properties
            .map((entry) => ({
                key: entry.key.trim(),
                value: entry.value.trim(),
            }))
            .filter((entry) => entry.key || entry.value);

        const cleanedLog = log
            .map((entry) => ({
                message: entry.message?.trim() || '',
                createdAt: entry.createdAt || new Date().toISOString(),
            }))
            .filter((entry) => entry.message);

        onSave({
            notes: notes.trim(),
            properties: cleanedProperties,
            log: cleanedLog,
        });
    };

    return (
        <div className="object-details-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="object-details-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="object-details-title"
            >
                <header className="object-details-modal-header">
                    <div>
                        <h2 id="object-details-title">{displayName}</h2>
                        <p className="object-details-modal-subtitle">{typeLabel}</p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm object-details-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </header>

                <div className="object-details-modal-body">
                    <div className="form-group">
                        <label htmlFor="object-notes">Notes</label>
                        <textarea
                            id="object-notes"
                            rows={5}
                            placeholder="Add notes about this object…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            readOnly={readOnly}
                        />
                    </div>

                    <div className="form-group">
                        <div className="object-details-properties-header">
                            <label>Properties</label>
                            {!readOnly && (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={addProperty}>
                                    + Add property
                                </button>
                            )}
                        </div>
                        <p className="object-details-hint">Custom key/value pairs — e.g. SKU, condition, location.</p>
                        <div className="object-details-properties">
                            {properties.map((entry, index) => (
                                <div key={index} className="object-details-property-row">
                                    <input
                                        type="text"
                                        placeholder="Key"
                                        value={entry.key}
                                        onChange={(e) => updateProperty(index, 'key', e.target.value)}
                                        aria-label={`Property ${index + 1} key`}
                                        readOnly={readOnly}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={entry.value}
                                        onChange={(e) => updateProperty(index, 'value', e.target.value)}
                                        aria-label={`Property ${index + 1} value`}
                                        readOnly={readOnly}
                                    />
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm object-details-remove"
                                            onClick={() => removeProperty(index)}
                                            aria-label={`Remove property ${index + 1}`}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="object-log-entry">Log</label>
                        <p className="object-details-hint">Timestamped updates — e.g. inspections, moves, maintenance.</p>
                        {!readOnly && (
                            <div className="object-details-log-compose">
                                <textarea
                                    id="object-log-entry"
                                    rows={2}
                                    placeholder="Add a log entry…"
                                    value={logDraft}
                                    onChange={(e) => setLogDraft(e.target.value)}
                                    onKeyDown={handleLogKeyDown}
                                />
                                <button
                                    type="button"
                                    className="btn btn-accent btn-sm object-details-log-add"
                                    onClick={addLogEntry}
                                    disabled={!logDraft.trim()}
                                >
                                    Add entry
                                </button>
                            </div>
                        )}
                        {sortedLog.length > 0 ? (
                            <ul className="object-details-log-list">
                                {sortedLog.map((entry, index) => (
                                    <li key={`${entry.createdAt}-${index}`} className="object-details-log-item">
                                        <div className="object-details-log-meta">
                                            <time dateTime={entry.createdAt}>{formatLogTimestamp(entry.createdAt)}</time>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm object-details-remove"
                                                    onClick={() => removeLogEntry(entry)}
                                                    aria-label="Remove log entry"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <p className="object-details-log-message">{entry.message}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="object-details-log-empty">No log entries yet.</p>
                        )}
                    </div>

                    {saveError && <p className="object-details-error">{saveError}</p>}
                </div>

                <footer className="object-details-modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                        {readOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}

export default ObjectDetailsModal;
