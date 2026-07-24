import axios from "axios";
import { storage } from "./storage";

const API_URL = "https://devine-care-backend.onrender.com/api/v1";

export const publicApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export const privateApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

privateApi.interceptors.request.use(async (config) => {
  const token = await storage.getItem("lifecare_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const Auth = {
  login: (email: string, password: string) =>
    publicApi.post("/auth/login", { email, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    privateApi.patch("/auth/change-password", { currentPassword, newPassword }),
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    position: string;
    departmentId?: string;
  }) => privateApi.post("/auth/register", data),
};

export const Staff = {
  getMyShifts: () => privateApi.get("/shifts/my-shifts"),
  clockIn: (latitude: number, longitude: number) =>
    privateApi.post("/attendance/clock-in", { latitude, longitude }),
  clockOut: () => privateApi.post("/attendance/clock-out"),
  getMyAttendance: () => privateApi.get("/attendance/my-attendance"),
  applyLeave: (data: any) => privateApi.post("/leave", data),
  getMyLeave: () => privateApi.get("/leave/my-leave"),
  getAnnouncements: () => privateApi.get("/announcements"),
  getConversations: () => privateApi.get("/chat/conversations"),
  getMessages: (id: string) =>
    privateApi.get(`/chat/conversations/${id}/messages`),
  getProfile: () => privateApi.get("/users/profile"),
  updateProfile: (data: { phone?: string; photoUrl?: string; bio?: string }) =>
    privateApi.put("/users/profile", data),

  startConversation: (targetUserId: string) =>
    privateApi.post("/chat/conversations", { targetUserId }),
  uploadImage: (formData: FormData) =>
    privateApi.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  createAnnouncement: (data: {
    title: string;
    content: string;
    departmentId?: string;
  }) => privateApi.post("/announcements", data),
  getDepartment: (id: string) => privateApi.get(`/departments/${id}`),
  generateShifts: (data: {
    departmentId: string;
    month: number;
    year: number;
    mode: "auto" | "manual";
    staffGroups?: { morning: string[]; night: string[]; rotating: string[] };
  }) => privateApi.post("/shifts/generate", data),
  submitFeedback: (message: string, category: string) =>
    privateApi.post("/feedback", { message, category }),
  savePushToken: (expoPushToken: string) =>
    privateApi.post("/users/push-token", { expoPushToken }),
  // getDepartmentLeave: () => privateApi.get("/leave/department"),
  getDepartments: () => privateApi.get("/departments"),
  getDepartmentLeave: (departmentId?: string) =>
    privateApi.get("/leave/department", {
      params: departmentId ? { departmentId } : {},
    }),
  reviewLeave: (
    id: string,
    status: "APPROVED" | "REJECTED",
    reviewNote?: string,
  ) => privateApi.patch(`/leave/${id}/review`, { status, reviewNote }),
  getDepartmentAttendance: (departmentId: string) =>
    privateApi.get(`/attendance/department/${departmentId}`),

  getHospitalSettings: () => privateApi.get("/settings"),
  updateHospitalSettings: (data: {
    name: string;
    latitude: number;
    longitude: number;
    geofenceRadius?: number;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  }) => privateApi.put("/settings", data),

  getAllStaff: () => privateApi.get("/users"),
  deactivateStaff: (id: string) => privateApi.patch(`/users/${id}/deactivate`),
  getMyGroupChat: () => privateApi.get("/chat/my-group"),
  getMyAppointments: () => privateApi.get("/appointments/doctor"),
  updateAppointmentStatus: (
    id: string,
    status: "CONFIRMED" | "COMPLETED" | "CANCELLED",
  ) => privateApi.patch(`/appointments/${id}/status`, { status }),
  syncGroupChats: () => privateApi.post("/chat/sync-groups"),
  getAllFeedback: () => privateApi.get("/feedback"),

  getMySwapRequests: () => privateApi.get("/shifts/swap-requests/my"),
  getDepartmentSwapRequests: (departmentId?: string) =>
    privateApi.get("/shifts/swap-requests/department", {
      params: departmentId ? { departmentId } : {},
    }),
  getColleagueShifts: () => privateApi.get("/shifts/colleagues"),
  requestSwap: (data: {
    targetStaffId: string;
    originalShiftId: string;
    targetShiftId: string;
  }) => privateApi.post("/shifts/swap-request", data),
  reviewSwapRequest: (id: string, status: "APPROVED" | "REJECTED") =>
    privateApi.patch(`/shifts/swap-request/${id}`, { status }),
};

export const Users = {
  getAll: () => privateApi.get("/users"),
};
