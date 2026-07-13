import "../global.css"; // 👈 add this line — must be first/near the top

import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "../lib/store";

export default function RootLayout() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate().then(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
