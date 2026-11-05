import axios, { AxiosError, AxiosInstance } from 'axios';
import { storageService } from './storage.service';

/**
 * The one place the app talks HTTP.
 * Module services call apiService.get / post / patch ... instead of using axios directly,
 * so the base URL, auth token, and error messages are handled the same way everywhere.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Params = object | undefined;

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 30_000,
});

let onUnauthorized: (() => void) | null = null;

http.interceptors.request.use((config) => {
  const token = storageService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] } | Blob>) => {
    const status = error.response?.status;
    const isLogin = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLogin) {
      storageService.clear();
      onUnauthorized?.();
    }

    let data = error.response?.data;
    // blob downloads return the error body as a Blob
    if (data instanceof Blob) {
      try {
        data = JSON.parse(await data.text());
      } catch {
        data = undefined;
      }
    }

    const raw = (data as { message?: string | string[] } | undefined)?.message;
    let message = Array.isArray(raw) ? raw[0] : raw;
    if (!message) {
      if (error.code === 'ERR_NETWORK') message = 'Cannot reach the server. Check that the backend is running.';
      else if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Try again.';
      else message = error.message;
    }
    return Promise.reject(new ApiError(message, status));
  },
);

/** Drops empty values so they are not sent as ?search=&productIds= */
const cleanParams = (params: Params) => {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)),
  );
};

export const apiService = {
  get<T>(url: string, params?: Params): Promise<T> {
    return http.get<T>(url, { params: cleanParams(params) }).then((r) => r.data);
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return http.post<T>(url, body).then((r) => r.data);
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return http.put<T>(url, body).then((r) => r.data);
  },

  patch<T>(url: string, body?: unknown): Promise<T> {
    return http.patch<T>(url, body).then((r) => r.data);
  },

  delete<T>(url: string): Promise<T> {
    return http.delete<T>(url).then((r) => r.data);
  },

  /** multipart/form-data upload; files go in the "files" field. */
  upload<T>(url: string, files: File[], fields: Record<string, string> = {}): Promise<T> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    return http.post<T>(url, form, { timeout: 120_000 }).then((r) => r.data);
  },

  /** Fetches a protected file (sends the token) as a Blob, e.g. to preview an image or PDF. */
  blob(url: string): Promise<Blob> {
    return http.get<Blob>(url, { responseType: 'blob', timeout: 120_000 }).then((r) => r.data);
  },

  /** Downloads a protected file (sends the token) and saves it with the given name. */
  async download(url: string, fileName: string): Promise<void> {
    saveFile(URL.createObjectURL(await this.blob(url)), fileName, true);
  },

  /** Called when any request returns 401 (expired or invalid token). */
  setUnauthorizedHandler(handler: (() => void) | null) {
    onUnauthorized = handler;
  },
};

/** Saves an object/blob URL as a file. Revokes the URL afterwards when `revoke` is set. */
export function saveFile(href: string, fileName: string, revoke = false): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
  error instanceof Error && error.message ? error.message : fallback;
