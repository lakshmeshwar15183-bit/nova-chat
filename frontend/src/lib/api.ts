import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

const ACCESS_TOKEN_KEY = 'novachat_access_token';

export const tokenStore = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  set: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send the httpOnly refresh cookie
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparent access-token refresh on 401.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${API_BASE}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = res.data?.data?.accessToken as string | undefined;
    if (token) {
      tokenStore.set(token);
      return token;
    }
  } catch {
    /* fall through */
  }
  return null;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Unwraps the `{ success, data }` envelope returned by the API. */
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export function apiErrorMessage(error: unknown): string {
  const err = error as AxiosError<{ message?: string | string[] }>;
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message || err.message || 'Something went wrong';
}

export { API_URL };
