import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

function cloneSnapshot(value) {
    return JSON.parse(JSON.stringify(value));
}

function snapshotsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function useUndoableState(initialValue) {
    const [state, setState] = useState(initialValue);
    const pastRef = useRef([]);
    const futureRef = useRef([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const syncFlags = useCallback(() => {
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(futureRef.current.length > 0);
    }, []);

    const setStateWithoutHistory = useCallback((value) => {
        setState((prev) => (typeof value === 'function' ? value(prev) : value));
    }, []);

    const setStateWithHistory = useCallback((updater) => {
        setState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (snapshotsEqual(next, prev)) {
                return prev;
            }

            pastRef.current = [...pastRef.current, cloneSnapshot(prev)].slice(-MAX_HISTORY);
            futureRef.current = [];
            queueMicrotask(syncFlags);
            return next;
        });
    }, [syncFlags]);

    const undo = useCallback(() => {
        if (!pastRef.current.length) {
            return null;
        }

        const previous = pastRef.current.pop();
        let restored = previous;

        setState((current) => {
            futureRef.current.push(cloneSnapshot(current));
            restored = previous;
            return previous;
        });

        syncFlags();
        return restored;
    }, [syncFlags]);

    const redo = useCallback(() => {
        if (!futureRef.current.length) {
            return null;
        }

        const next = futureRef.current.pop();
        let restored = next;

        setState((current) => {
            pastRef.current.push(cloneSnapshot(current));
            restored = next;
            return next;
        });

        syncFlags();
        return restored;
    }, [syncFlags]);

    const resetHistory = useCallback(() => {
        pastRef.current = [];
        futureRef.current = [];
        syncFlags();
    }, [syncFlags]);

    return {
        state,
        setState: setStateWithHistory,
        setStateWithoutHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        resetHistory,
    };
}
