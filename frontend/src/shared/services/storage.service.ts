const TOKEN_KEY = 'td.token';
const USER_KEY = 'td.user';

/** Safe wrapper around localStorage (it can throw in private windows). */
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

export const storageService = {
  getToken: () => read(TOKEN_KEY),
  setToken: (token: string) => write(TOKEN_KEY, token),

  getUser<T>(): T | null {
    const raw = read(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser: (user: unknown) => write(USER_KEY, JSON.stringify(user)),

  get: read,
  set: write,

  clear() {
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
  },
};
