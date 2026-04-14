export function createOneFlightLoader<T>(load: () => Promise<T>) {
  let pending: Promise<T> | null = null;

  return () => {
    if (pending) {
      return pending;
    }

    pending = load().finally(() => {
      pending = null;
    });

    return pending;
  };
}

export function createKeyedOneFlightLoader<TKey, TValue>(load: (key: TKey) => Promise<TValue>) {
  const pending = new Map<TKey, Promise<TValue>>();

  return (key: TKey) => {
    const current = pending.get(key);
    if (current) {
      return current;
    }

    const next = load(key).finally(() => {
      pending.delete(key);
    });

    pending.set(key, next);
    return next;
  };
}
