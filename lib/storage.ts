import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore only exists on iOS/Android. On web, fall back to localStorage.
// This is a lower security bar than native Keychain/Keystore, but it's the
// only option in a browser — worth knowing if you ever store something
// more sensitive here than a JWT.

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        console.log("localStorage setItem failed:", err);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.log("localStorage removeItem failed:", err);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
