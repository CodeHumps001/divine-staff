// app/(app)/_layout.tsx
import {
  registerForPushNotifications,
  setupNotificationResponseListener,
} from "@/lib/notifications";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  Calendar,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";
// app/(app)/_layout.tsx — update the useEffect
// app/(app)/_layout.tsx — update the useEffect

const ACTIVE_COLOR = "#0F766E";
const INACTIVE_COLOR = "#94A3B8";

function TabIcon({
  focused,
  icon: Icon,
  label,
}: {
  focused: boolean;
  icon: any;
  label: string;
}) {
  return (
    <View className="items-center justify-center">
      <View
        className={`items-center justify-center rounded-full ${
          focused ? "bg-emerald-50" : ""
        }`}
        style={{ width: 40, height: 40 }}
      >
        <Icon
          size={22}
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth={focused ? 2 : 1.8}
        />
      </View>
      <Text
        className={`text-[10px] font-semibold mt-0.5 leading-3 ${
          focused ? "text-emerald-700" : "text-slate-400"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppTabsLayout() {
  // inside AppTabsLayout:
  useEffect(() => {
    registerForPushNotifications();
    const subscription = setupNotificationResponseListener();
    return () => subscription.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 16,
          maxWidth: 420,
          width: "100%",
          alignSelf: "center",
          height: 72,
          paddingTop: 4,
          paddingBottom: 8,
          paddingHorizontal: 4,
          borderRadius: 28,
          borderTopWidth: 0,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : "rgba(255,255,255,0.85)",
          shadowColor: "#000000",
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.3)",
          overflow: "hidden",
        },
        tabBarBackground: () => {
          if (Platform.OS === "ios") {
            return (
              <BlurView
                intensity={30}
                tint="light"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 28,
                  overflow: "hidden",
                }}
              />
            );
          }
          return null;
        },
        tabBarLabel: () => null,
        tabBarItemStyle: {
          borderRadius: 16,
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={LayoutDashboard} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="shifts/index"
        options={{
          title: "Shifts",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Calendar} label="Shifts" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={MessageCircle} label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "Updates",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Megaphone} label="Updates" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={User} label="Profile" />
          ),
        }}
      />

      {/* ── Hidden from tab bar, still navigable via router.push ── */}
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="leave/index" options={{ href: null }} />
      <Tabs.Screen name="leave/department" options={{ href: null }} />
      <Tabs.Screen name="shifts/generate" options={{ href: null }} />
      <Tabs.Screen
        name="chat/[id]"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen name="settings/hospital" options={{ href: null }} />
      <Tabs.Screen name="settings/staff" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="settings/feedback" options={{ href: null }} />
    </Tabs>
  );
}
