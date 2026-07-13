import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

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
    await SecureStore.setItemAsync("lifecare_token", token);
    await SecureStore.setItemAsync("lifecare_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("lifecare_token");
    await SecureStore.deleteItemAsync("lifecare_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("lifecare_token");
    const userStr = await SecureStore.getItemAsync("lifecare_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {}
    }
  },
}));
