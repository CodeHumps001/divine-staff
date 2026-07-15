// lib/notifications.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { Staff } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log(
      "No EAS projectId found — push token cannot be generated. Run `eas init` or add extra.eas.projectId to app.json.",
    );
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await Staff.savePushToken(token);
  } catch (err) {
    console.log("Failed to get/save push token:", err);
  }
};

// ── Handle taps on notifications: route to the relevant screen ──
type NotificationData = {
  type?:
    | "LEAVE_REVIEW"
    | "LEAVE_SUBMITTED"
    | "NEW_MESSAGE"
    | "SHIFT_REMINDER"
    | "ANNOUNCEMENT";
  conversationId?: string;
  leaveId?: string;
};

const handleNotificationTap = (data: NotificationData) => {
  switch (data.type) {
    case "LEAVE_REVIEW":
      // staff member's own leave was approved/rejected
      router.push("/(app)/leave");
      break;
    case "LEAVE_SUBMITTED":
      // a dept head/admin needs to review a new request
      router.push("/(app)/leave/department");
      break;
    case "NEW_MESSAGE":
      if (data.conversationId) {
        router.push(`/(app)/chat/${data.conversationId}`);
      } else {
        router.push("/(app)/chat");
      }
      break;
    case "SHIFT_REMINDER":
      router.push("/(app)/shifts");
      break;
    case "ANNOUNCEMENT":
      router.push("/(app)/announcements");
      break;
    default:
      router.push("/(app)/dashboard");
  }
};

export const setupNotificationResponseListener = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content
        .data as NotificationData;
      handleNotificationTap(data);
    },
  );
  return subscription;
};
