import axios from "axios";
import * as SecureStore from "expo-secure-store";

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
  const token = await SecureStore.getItemAsync("lifecare_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const Auth = {
  login: (email: string, password: string) =>
    publicApi.post("/auth/login", { email, password }),
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
};

export const Users = {
  getAll: () => privateApi.get("/users"),
};
