// app/(app)/announcements.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Megaphone, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Staff } from "../../lib/api";

type Announcement = {
  id: string;
  title: string;
  content: string;
  departmentId: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string };
};

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await Staff.getAnnouncements();
      const data: Announcement[] = res.data.data || [];
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setAnnouncements(data);
    } catch (err) {
      console.log("Announcements load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#0F766E", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mx-4 mt-3 rounded-[28px] px-4 py-4"
      >
        <View className="flex-row items-center p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">
              Announcements
            </Text>
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
          {announcements.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <Megaphone size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No announcements yet
              </Text>
            </View>
          ) : (
            announcements.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelected(a)}
                activeOpacity={0.85}
                className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="w-9 h-9 rounded-xl bg-green-50 items-center justify-center mr-3">
                    <Megaphone size={16} color="#006B3C" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-gray-900 font-semibold"
                      numberOfLines={2}
                    >
                      {a.title}
                    </Text>
                    <Text
                      className="text-gray-400 text-sm mt-1"
                      numberOfLines={2}
                    >
                      {a.content}
                    </Text>
                    <View className="flex-row items-center justify-between mt-2">
                      <Text className="text-gray-400 text-xs">
                        {a.author.firstName} {a.author.lastName}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {timeAgo(a.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Detail modal ── */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[80%]">
            <View className="flex-row items-start justify-between mb-4">
              <Text className="text-gray-900 text-lg font-bold flex-1 pr-4">
                {selected?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-400 text-xs mb-4">
              {selected?.author.firstName} {selected?.author.lastName} ·{" "}
              {selected ? timeAgo(selected.createdAt) : ""}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-700 text-sm leading-6">
                {selected?.content}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
