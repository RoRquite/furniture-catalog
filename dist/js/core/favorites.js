// Favorites MVP: client-side only (localStorage), no backend needed yet.

const KEY = "fc_favorites_v1";

export function loadFavorites(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list, storage) {
  storage.setItem(KEY, JSON.stringify(list));
}

export function createFavorites(storage = globalThis.localStorage) {
  let list = loadFavorites(storage);
  return {
    list: () => [...list],
    has(id) {
      return list.includes(id);
    },
    add(id) {
      if (!list.includes(id)) {
        list.push(id);
        save(list, storage);
      }
      return [...list];
    },
    remove(id) {
      list = list.filter((x) => x !== id);
      save(list, storage);
      return [...list];
    },
    toggle(id) {
      return this.has(id) ? this.remove(id) : this.add(id);
    },
  };
}
