// app/(app)/(tabs)/_layout.tsx
import {
  registerForPushNotifications,
  setupNotificationResponseListener,
} from "@/lib/notifications";
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_MIN_BOTTOM_OFFSET,
} from "@/lib/useTabBarHeight";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  Calendar,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Keyboard, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = "#0F766E";
const INACTIVE_COLOR = "#94A3B8";
const HIDDEN_TAB_BAR_STYLE = { display: "none" as const };

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
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    registerForPushNotifications();
    const subscription = setupNotificationResponseListener();
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Distance from the bottom of the screen, accounting for Android's
  // edge-to-edge gesture bar (or iOS home indicator) instead of a fixed
  // guess. Falls back to 16 on devices reporting a 0 inset (older Android
  // 3-button nav) so the bar isn't glued to the very edge.
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET);
  const tabBarStyle = {
    position: "absolute" as const,
    left: 20,
    right: 20,
    bottom: tabBarBottom,
    maxWidth: 420,
    width: "100%" as const,
    alignSelf: "center" as const,
    height: TAB_BAR_HEIGHT,
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
    overflow: "hidden" as const,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarHideOnKeyboard: true,
        tabBarStyle: keyboardVisible ? HIDDEN_TAB_BAR_STYLE : tabBarStyle,
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
        name="chat"
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

    </Tabs>
  );
}
