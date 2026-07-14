// app/(app)/announcements.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Megaphone, Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

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

// ── Reusable bottom-sheet modal that stays clear of the keyboard ──
function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                className="bg-white rounded-t-[28px] px-5 pt-5"
                style={{
                  maxHeight: "85%",
                  paddingBottom: Platform.OS === "ios" ? 34 : 20,
                }}
              >
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="text-gray-900 text-lg font-bold">
                    {title}
                  </Text>
                  <TouchableOpacity onPress={onClose}>
                    <X size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  {children}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canPost = user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

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

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Missing info", "Please add both a title and content.");
      return;
    }
    setPosting(true);
    try {
      await Staff.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
      });
      setFormOpen(false);
      resetForm();
      loadAnnouncements();
    } catch (err: any) {
      Alert.alert(
        "Couldn't post",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7F6]" edges={["bottom"]}>
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
            <Text className="text-white text-base font-semibold">
              Announcements
            </Text>
          </View>
          {canPost && (
            <TouchableOpacity
              onPress={() => setFormOpen(true)}
              className="w-10 h-10 rounded-full items-center justify-center bg-white/15 absolute right-5"
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
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

      {/* ── Detail view — read-only, no keyboard involved, stays a plain Modal ── */}
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

      {/* ── New announcement form — now keyboard-safe via BottomSheetModal ── */}
      <BottomSheetModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title="New Announcement"
      >
        <Text className="text-gray-700 text-sm font-medium mb-1.5">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. New PPE guidelines"
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
        />

        <Text className="text-gray-700 text-sm font-medium mb-1.5">
          Content
        </Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write the announcement..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          returnKeyType="default"
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-6"
          style={{ textAlignVertical: "top", minHeight: 120 }}
        />

        <TouchableOpacity
          onPress={handlePost}
          disabled={posting}
          className={`rounded-xl py-4 items-center justify-center ${
            posting ? "bg-green-300" : "bg-[#006B3C]"
          }`}
        >
          {posting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Post Announcement
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
