import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const getBase = () => {
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) {
    return (import.meta as any).env.BASE_URL.replace(/\/$/, "");
  }
  return "";
};

const apiFetch = async (path: string, opts?: RequestInit) => {
  const base = getBase();
  const res = await fetch(`${base}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
};

export interface Appointment {
  id: number;
  userId: number;
  doctorId?: number | null;
  therapistName?: string | null;
  therapyType: string;
  appointmentDate: string;
  status: string;
  notes?: string | null;
  reminderEmail?: string | null;
  reminderSent?: boolean | null;
  createdAt: string;
  patientName?: string | null;
  patientUsername?: string | null;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string | null;
  role: string;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  entryMethod?: string | null;
}

export const getGetCurrentUserQueryKey = () => ["/api/auth/me"] as const;

export function useGetCurrentUser(opts?: { query?: Record<string, unknown> }) {
  return useQuery<User>({
    queryKey: getGetCurrentUserQueryKey(),
    queryFn: () => apiFetch("/auth/me"),
    ...(opts?.query || {}),
  });
}

export function useLoginUser(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<User, Error, { username: string; password: string }>({
    mutationFn: (data) =>
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...(opts?.mutation || {}),
  });
}

export function useRegisterUser(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<User, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...(opts?.mutation || {}),
  });
}

export function useLogoutUser(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<void, Error, void>({
    mutationFn: () =>
      apiFetch("/auth/logout", { method: "POST" }),
    ...(opts?.mutation || {}),
  });
}

export const getGetAppointmentsQueryKey = () => ["/api/appointments"] as const;

export function useGetAppointments(opts?: { query?: Record<string, unknown> }) {
  return useQuery<Appointment[]>({
    queryKey: getGetAppointmentsQueryKey(),
    queryFn: () => apiFetch("/appointments"),
    ...(opts?.query || {}),
  });
}

export function useCreateAppointment(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<Appointment, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...(opts?.mutation || {}),
  });
}

export function useUpdateAppointment(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<Appointment, Error, { id: number; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) =>
      apiFetch(`/appointments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    ...(opts?.mutation || {}),
  });
}

export function useDeleteAppointment(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) =>
      apiFetch(`/appointments/${id}`, { method: "DELETE" }),
    ...(opts?.mutation || {}),
  });
}

export function useSendAppointmentReminder(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) =>
      apiFetch(`/appointments/${id}/send-reminder`, { method: "POST" }),
    ...(opts?.mutation || {}),
  });
}

export const getGetNotificationsQueryKey = () => ["/api/notifications"] as const;

export function useGetNotifications(opts?: { query?: Record<string, unknown> }) {
  return useQuery<Notification[]>({
    queryKey: getGetNotificationsQueryKey(),
    queryFn: () => apiFetch("/notifications"),
    ...(opts?.query || {}),
  });
}

export function useMarkNotificationRead(opts?: { mutation?: Record<string, unknown> }) {
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiFetch(`/notifications/${id}/read`, { method: "PUT" }),
    ...(opts?.mutation || {}),
  });
}
