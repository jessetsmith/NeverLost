import React, { useEffect, useState } from 'react';

function clampNumber(value, min, max) {
    let next = value;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
}

function DraftNumberInput({
    value,
    onCommit,
    min,
    max,
    step,
    id,
    inputMode = 'decimal',
    ...props
}) {
    const [draft, setDraft] = useState(null);

    useEffect(() => {
        if (draft !== null && parseFloat(draft) === value) {
            setDraft(null);
        }
    }, [value, draft]);

    const displayValue = draft !== null ? draft : String(value);

    const commit = (raw) => {
        let num = parseFloat(raw);
        if (raw === '' || Number.isNaN(num)) {
            num = value;
        }
        num = clampNumber(num, min, max);
        onCommit(num);
        setDraft(null);
    };

    return (
        <input
            {...props}
            id={id}
            type="text"
            inputMode={inputMode}
            step={step}
            value={displayValue}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    commit(e.currentTarget.value);
                    e.currentTarget.blur();
                }
            }}
        />
    );
}

export default DraftNumberInput;
