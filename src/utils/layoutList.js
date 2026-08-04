export function parseLayoutsResponse(data) {
  if (Array.isArray(data)) {
    return {owned: data, shared: []};
  }

  return {
    owned: Array.isArray(data?.owned) ? data.owned : [],
    shared: Array.isArray(data?.shared) ? data.shared : [],
  };
}

export function flattenEditableLayouts(data) {
  const {owned, shared} = parseLayoutsResponse(data);
  return [...owned, ...shared];
}
