import axios, { AxiosError } from "axios";
import { supabase } from "../supabase";

export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  /** The plan does not unlock the feature (HTTP 402 from the API). */
  get needsUpgrade(): boolean {
    return this.code === "plan_upgrade_required";
  }

  /** The whole area is locked ("coming soon") for this user (HTTP 403 `module_locked`). */
  get moduleLocked(): boolean {
    return this.code === "module_locked";
  }
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 20_000 });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ message?: string; code?: string; details?: Record<string, unknown> }>) => {
    const body = error.response?.data;
    return Promise.reject(
      new ApiError(
        body?.message ?? "Não foi possível falar com o servidor. Tente de novo.",
        error.response?.status ?? 0,
        body?.code ?? "network_error",
        body?.details,
      ),
    );
  },
);

export async function get<T>(url: string, params?: object): Promise<T> {
  return (await api.get<ApiEnvelope<T>>(url, { params })).data.data;
}

export async function getPage<T>(url: string, params?: object): Promise<ApiEnvelope<T[]>> {
  return (await api.get<ApiEnvelope<T[]>>(url, { params })).data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post<ApiEnvelope<T>>(url, body ?? {})).data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  return (await api.put<ApiEnvelope<T>>(url, body ?? {})).data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  return (await api.patch<ApiEnvelope<T>>(url, body ?? {})).data.data;
}

export async function del<T>(url: string, body?: unknown): Promise<T> {
  return (await api.delete<ApiEnvelope<T>>(url, { data: body })).data.data;
}

/** Uploads a file to the signed URL returned by the API (Supabase Storage). */
export async function uploadToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new ApiError("Falha ao enviar o arquivo.", res.status, "upload_failed");
}
