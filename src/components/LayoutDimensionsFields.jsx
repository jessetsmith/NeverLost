import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';

const NUMERIC_KEYS = ['width', 'depth', 'height'];

function LayoutDimensionsFields({ dimensions, onChange, idPrefix = 'layout-dim', lockDepthToWidth = false }, ref) {
    const [draft, setDraft] = useState({});
    const dimensionsRef = useRef(dimensions);
    dimensionsRef.current = dimensions;

    const commitField = (key, raw) => {
        const current = dimensionsRef.current;
        let num = parseFloat(raw);
        if (raw === '' || Number.isNaN(num)) {
            num = current[key];
        }
        let next = { ...current, [key]: num };
        if (lockDepthToWidth && key === 'width') {
            next.depth = num;
        }
        onChange(next);
        setDraft((prev) => {
            if (prev[key] === undefined) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const flushAll = (commit = true) => {
        const current = dimensionsRef.current;
        let next = { ...current };
        NUMERIC_KEYS.forEach((key) => {
            if (draft[key] !== undefined) {
                let num = parseFloat(draft[key]);
                if (draft[key] === '' || Number.isNaN(num)) {
                    num = current[key];
                }
                next[key] = num;
            }
        });
        if (commit) {
            if (lockDepthToWidth && next.width !== current.width) {
                next.depth = next.width;
            }
            onChange(next);
            setDraft({});
        }
        return next;
    };

    useImperativeHandle(ref, () => ({
        flush: (commit = true) => flushAll(commit),
        clearDraft: () => setDraft({}),
    }), [draft, onChange]);

    useEffect(() => {
        setDraft((prev) => {
            const next = { ...prev };
            let changed = false;
            NUMERIC_KEYS.forEach((key) => {
                if (next[key] !== undefined && parseFloat(next[key]) === dimensions[key]) {
                    delete next[key];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [dimensions.width, dimensions.depth, dimensions.height]);

    const displayValue = (key) => (draft[key] !== undefined ? draft[key] : String(dimensions[key]));

    const handleChange = (key, raw) => {
        setDraft((prev) => ({ ...prev, [key]: raw }));
    };

    const unitLabel = dimensions.unit === 'm' ? 'meters' : 'feet';

    return (
        <div className="layout-dimensions-fields">
            <div className="layout-dimensions-row">
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-width`}>Width ({unitLabel})</label>
                    <input
                        id={`${idPrefix}-width`}
                        type="number"
                        min="4"
                        max="200"
                        step="0.5"
                        value={displayValue('width')}
                        onChange={(e) => handleChange('width', e.target.value)}
                        onBlur={(e) => commitField('width', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-depth`}>Depth ({unitLabel})</label>
                    <input
                        id={`${idPrefix}-depth`}
                        type="number"
                        min="4"
                        max="200"
                        step="0.5"
                        value={displayValue('depth')}
                        onChange={(e) => handleChange('depth', e.target.value)}
                        onBlur={(e) => commitField('depth', e.target.value)}
                        disabled={lockDepthToWidth}
                    />
                </div>
            </div>
            <div className="layout-dimensions-row">
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-height`}>Ceiling height ({unitLabel})</label>
                    <input
                        id={`${idPrefix}-height`}
                        type="number"
                        min="4"
                        max="100"
                        step="0.5"
                        value={displayValue('height')}
                        onChange={(e) => handleChange('height', e.target.value)}
                        onBlur={(e) => commitField('height', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor={`${idPrefix}-unit`}>Unit</label>
                    <select
                        id={`${idPrefix}-unit`}
                        value={dimensions.unit}
                        onChange={(e) => onChange({ ...dimensions, unit: e.target.value })}
                    >
                        <option value="ft">Feet</option>
                        <option value="m">Meters</option>
                    </select>
                </div>
            </div>
            <p className="layout-dimensions-hint">
                1 grid square = 0.5 {dimensions.unit === 'm' ? 'meters' : 'feet'}. Changing width or depth
                rescales objects to fit the new room size.
            </p>
        </div>
    );
}

export default forwardRef(LayoutDimensionsFields);
