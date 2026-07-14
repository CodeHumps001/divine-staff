import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MessageCircle, Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff, Users } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

type Member = {
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    position: string;
    profile?: { photoUrl?: string | null } | null;
    isActive?: boolean;
  };
};

type LastMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  departmentId: string | null;
  members: Member[];
  messages: LastMessage[]; // last message only, per getMyConversations
};

type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  profile?: { photoUrl?: string | null } | null;
};

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const insets = useSafeAreaInsets();
  const loadConversations = useCallback(async () => {
    try {
      const res = await Staff.getConversations();
      const data: Conversation[] = res.data.data || [];
      data.sort((a, b) => {
        const at = a.messages[0]?.createdAt || "";
        const bt = b.messages[0]?.createdAt || "";
        return bt.localeCompare(at);
      });
      setConversations(data);
    } catch (err) {
      console.log("Conversations load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const openPicker = async () => {
    setPickerOpen(true);
    try {
      const res = await Users.getAll();
      const list: StaffUser[] = (res.data.data || []).filter(
        (u: StaffUser) => u.id !== user?.id,
      );
      setStaffList(list);
    } catch (err) {
      console.log("Users load error:", err);
    }
  };

  const startChat = async (targetUserId: string) => {
    setStarting(true);
    try {
      const res = await Staff.startConversation(targetUserId);
      const conversation = res.data.data;
      const targetUser = staffList.find((s) => s.id === targetUserId);
      const contactName = targetUser
        ? `${targetUser.firstName} ${targetUser.lastName}`.trim()
        : "New chat";
      setPickerOpen(false);
      router.push({
        pathname: "/(app)/chat/[id]",
        params: {
          id: conversation.id,
          contactName,
          contactPhoto: targetUser?.profile?.photoUrl || "",
          contactStatus: "Active now",
        },
      });
    } catch (err) {
      console.log("Start conversation error:", err);
    } finally {
      setStarting(false);
    }
  };

  const getOtherMember = (conv: Conversation) =>
    conv.members.find((m) => m.userId !== user?.id)?.user;

  const filteredStaff = staffList.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

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
        <View className="flex-row items-center justify-between p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <MessageCircle size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">Chat</Text>
          </View>
          <TouchableOpacity
            onPress={openPicker}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
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
          {conversations.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <MessageCircle size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No conversations yet
              </Text>
            </View>
          ) : (
            conversations.map((conv) => {
              const other = getOtherMember(conv);
              const last = conv.messages[0];
              const displayName =
                conv.type === "DIRECT"
                  ? `${other?.firstName || "Unknown"} ${other?.lastName || ""}`
                  : "Department Group";

              return (
                <TouchableOpacity
                  key={conv.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/chat/[id]",
                      params: {
                        id: conv.id,
                        contactName: displayName,
                        contactPhoto: other?.profile?.photoUrl || "",
                        contactStatus: other?.isActive ? "Active now" : "Away",
                      },
                    })
                  }
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-2 flex-row items-center"
                >
                  <View className="w-11 h-11 rounded-full bg-green-50 items-center justify-center mr-3">
                    <Text className="text-[#006B3C] font-bold">
                      {displayName.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold">
                      {displayName}
                    </Text>
                    <Text
                      className="text-gray-400 text-sm mt-0.5"
                      numberOfLines={1}
                    >
                      {last ? last.content : "No messages yet"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {pickerOpen && (
        <View className="absolute inset-0 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-900 text-lg font-bold">
                New Message
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search staff..."
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4"
            />
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredStaff.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => startChat(s.id)}
                  disabled={starting}
                  className="flex-row items-center py-3 border-b border-gray-50"
                >
                  <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center mr-3">
                    <Text className="text-[#006B3C] font-bold text-xs">
                      {s.firstName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 text-sm font-medium">
                      {s.firstName} {s.lastName}
                    </Text>
                    <Text className="text-gray-400 text-xs">{s.position}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
