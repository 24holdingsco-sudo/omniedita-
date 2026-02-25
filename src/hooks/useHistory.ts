import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [canUndo, past, present, future]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [canRedo, past, present, future]);

  const set = useCallback(
    (newPresent: T | ((current: T) => T)) => {
      setPresent((currentPresent) => {
        const resolvedPresent =
          typeof newPresent === 'function'
            ? (newPresent as (current: T) => T)(currentPresent)
            : newPresent;

        if (resolvedPresent === currentPresent) {
          return currentPresent;
        }

        setPast((currentPast) => [...currentPast, currentPresent]);
        setFuture([]);
        return resolvedPresent;
      });
    },
    []
  );

  const reset = useCallback((newInitialState: T) => {
    setPast([]);
    setPresent(newInitialState);
    setFuture([]);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
