const inflightRequests = new Map();
const lastRequestAt = new Map();

export function runGuardedRequest(key, requestFn, { minIntervalMs = 750, force = false } = {}) {
  if (!force) {
    const inFlight = inflightRequests.get(key);
    if (inFlight) {
      return inFlight;
    }

    const lastAt = lastRequestAt.get(key);
    if (lastAt && Date.now() - lastAt < minIntervalMs) {
      return Promise.resolve(null);
    }
  }

  const promise = (async () => {
    try {
      return await requestFn();
    } finally {
      inflightRequests.delete(key);
      lastRequestAt.set(key, Date.now());
    }
  })();

  inflightRequests.set(key, promise);
  return promise;
}

export function clearGuardedRequest(key) {
  inflightRequests.delete(key);
  lastRequestAt.delete(key);
}
