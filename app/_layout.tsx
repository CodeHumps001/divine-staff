import "../global.css"; // 👈 add this line — must be first/near the top

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar"; // NEW
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context"; // 👈 ADD THIS IMPORT
import { useAuthStore } from "../lib/store";

export default function RootLayout() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate().then(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      {/* 👈 WRAP THE ROOT HERE */}
      <StatusBar style="light" />
      {/* "light" = light-colored icons (white clock/battery/signal),
          which is what you want against your dark green gradient headers.
          If any screen has a white/light background right under the status
          bar (like the login screen's photo, which already has a dark
          overlay, so it's fine), you'd want "dark" there instead — but for
          this app, "light" globally should cover every screen consistently. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}
