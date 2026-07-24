import { create } from "zustand";
import { storage } from "./storage";

interface AuthStore {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: any, token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (user, token) => {
    await storage.setItem("lifecare_token", token);
    await storage.setItem("lifecare_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await storage.deleteItem("lifecare_token");
    await storage.deleteItem("lifecare_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const token = await storage.getItem("lifecare_token");
    const userStr = await storage.getItem("lifecare_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {}
    }
  },
}));
