// app/(app)/chat/index.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Plus,
  Users as UsersIcon,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  department?: { name: string } | null;
  members: Member[];
  messages: LastMessage[];
};

type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  profile?: { photoUrl?: string | null } | null;
};

// ── Avatar with photo fallback to initials ──
function Avatar({
  photoUrl,
  name,
  isGroup,
  size = 44,
}: {
  photoUrl?: string | null;
  name: string;
  isGroup?: boolean;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  if (isGroup) {
    return (
      <View
        className="bg-emerald-100 items-center justify-center"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <UsersIcon size={size * 0.42} color="#0F766E" />
      </View>
    );
  }
  const initials = name.charAt(0).toUpperCase() || "?";
  return (
    <View
      className="bg-green-50 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-[#006B3C] font-bold">{initials}</Text>
    </View>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(false);

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

  const openGroupChat = async () => {
    try {
      const res = await Staff.getMyGroupChat();
      setPickerOpen(false);
      router.push({
        pathname: "/(app)/chat/[id]",
        params: {
          id: res.data.data.id,
          contactName: "Department Group",
          isGroup: "1",
        },
      });
    } catch (err) {
      console.log("Group chat error:", err);
    }
  };

  const getOtherMember = (conv: Conversation) =>
    conv.members.find((m) => m.userId !== user?.id)?.user;

  const filteredStaff = staffList.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Split into two clearly separated sections instead of one mixed list ──
  const groupConversations = conversations.filter((c) => c.type === "GROUP");
  const directConversations = conversations.filter((c) => c.type === "DIRECT");

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

  const renderDirectRow = (conv: Conversation) => {
    const other = getOtherMember(conv);
    const last = conv.messages[0];
    const displayName =
      `${other?.firstName || "Unknown"} ${other?.lastName || ""}`.trim();

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
              isGroup: "0",
            },
          })
        }
        activeOpacity={0.85}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-2 flex-row items-center"
      >
        <Avatar photoUrl={other?.profile?.photoUrl} name={displayName} />
        <View className="flex-1 ml-3">
          <Text className="text-gray-900 font-semibold" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
            {last ? last.content : "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white/15">
            <MessageCircle size={20} color="#ffffff" />
          </View>
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
        {/* ── Department Group section ── */}
        <View className="mx-6 mt-6">
          <Text className="text-gray-700 text-[13px] font-semibold mb-2.5">
            Department
          </Text>
          {groupConversations.length === 0 ? (
            <TouchableOpacity
              onPress={openGroupChat}
              activeOpacity={0.85}
              className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center"
            >
              <Avatar photoUrl={null} name="Department" isGroup />
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 font-semibold">
                  Department Group
                </Text>
                <Text className="text-gray-400 text-sm mt-0.5">
                  Tap to open your team chat
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            groupConversations.map((conv) => {
              const last = conv.messages[0];
              const displayName = conv.department?.name
                ? `${conv.department.name} Team`
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
                        contactStatus: `${conv.members.length} members`,
                        isGroup: "1",
                      },
                    })
                  }
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center"
                >
                  <Avatar photoUrl={null} name={displayName} isGroup />
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-gray-900 font-semibold"
                      numberOfLines={1}
                    >
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

        {/* ── Direct Messages section ── */}
        <View className="mx-6 mt-6">
          <Text className="text-gray-700 text-[13px] font-semibold mb-2.5">
            Direct Messages
          </Text>
          {directConversations.length === 0 ? (
            <View className="items-center py-12 bg-white rounded-2xl border border-gray-100">
              <MessageCircle size={28} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No direct messages yet
              </Text>
            </View>
          ) : (
            directConversations.map(renderDirectRow)
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
                  <Avatar
                    photoUrl={s.profile?.photoUrl}
                    name={s.firstName}
                    size={36}
                  />
                  <View className="ml-3">
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
