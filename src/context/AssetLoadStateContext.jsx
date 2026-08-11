import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AssetLoadStateContext = createContext(null);

export function AssetLoadStateProvider({ children }) {
    const [states, setStates] = useState({});

    const setLoadState = useCallback((objectId, status) => {
        if (objectId == null) return;
        const key = String(objectId);
        setStates((prev) => {
            if (prev[key] === status) return prev;
            return { ...prev, [key]: status };
        });
    }, []);

    const value = useMemo(() => ({ states, setLoadState }), [states, setLoadState]);

    return (
        <AssetLoadStateContext.Provider value={value}>
            {children}
        </AssetLoadStateContext.Provider>
    );
}

export function useAssetLoadStates() {
    const context = useContext(AssetLoadStateContext);
    if (!context) {
        return { states: {}, setLoadState: () => {} };
    }
    return context;
}

export function useAssetLoadState(objectId) {
    const { states } = useAssetLoadStates();
    if (objectId == null) return undefined;
    return states[String(objectId)];
}
