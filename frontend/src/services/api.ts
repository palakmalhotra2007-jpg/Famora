import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform, Alert } from 'react-native';
import { useAuthStore, useFamilyStore } from '../store';

import Constants from 'expo-constants';

const getDefaultApiUrl = () => {
  if (Platform.OS === 'android' && !Constants.expoConfig?.hostUri) {
    return 'http://10.0.2.2:3001/api/v1';
  }
  
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const localIp = hostUri.split(':')[0];
    return `http://${localIp}:3001/api/v1`;
  }
  
  return 'http://localhost:3001/api/v1';
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      useFamilyStore.getState().clearFamily();
    }
    const message = error.response?.data?.error ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number };
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, body);
  return response.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(url, body);
  return response.data.data;
}
