import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, MessageSquare, ShieldAlert } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

type Feedback = {
  id: string;
  category: string;
  message: string;
  createdAt: string;
  user: { firstName: string; lastName: string; position: string };
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  GENERAL: { bg: "bg-gray-100", text: "text-gray-600" },
  BUG: { bg: "bg-red-50", text: "text-red-600" },
  FEATURE_REQUEST: { bg: "bg-blue-50", text: "text-blue-600" },
};

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/(app)/dashboard");
  }, [isSuperAdmin]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);

  const loadFeedback = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await Staff.getAllFeedback();
      const data: Feedback[] = res.data.data || [];
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setFeedbackList(data);
    } catch (err) {
      console.log("Feedback load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedback();
  };

  if (!isSuperAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <ShieldAlert size={32} color="#D1D5DB" />
        <Text className="text-gray-400 text-sm mt-3 text-center">
          You don't have permission to view this page
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <LinearGradient
        colors={["#0F766E", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12 }}
        className="mx-4 rounded-[28px] px-4 py-4"
      >
        <View className="flex-row items-center p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">Feedback</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mx-6 mt-6">
          {feedbackList.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <MessageSquare size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No feedback yet
              </Text>
            </View>
          ) : (
            feedbackList.map((f) => {
              const style =
                CATEGORY_STYLES[f.category] || CATEGORY_STYLES.GENERAL;
              return (
                <View
                  key={f.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-900 font-semibold">
                      {f.user.firstName} {f.user.lastName}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-full ${style.bg}`}>
                      <Text
                        className={`text-[10px] font-semibold ${style.text}`}
                      >
                        {f.category.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-xs mb-2">
                    {f.user.position}
                  </Text>
                  <Text className="text-gray-700 text-sm">{f.message}</Text>
                  <Text className="text-gray-400 text-xs mt-2">
                    {new Date(f.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
