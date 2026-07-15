// app/(app)/chat/[id].tsx
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCheck,
  Phone,
  Send,
  Users as UsersIcon,
  Video,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";
import { disconnectSocket, getSocket } from "../../../lib/socket";
import { useAuthStore } from "../../../lib/store";

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { firstName: string; lastName: string; position: string };
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function MessageBubble({
  message,
  isMine,
  isGrouped,
  showSenderName,
}: {
  message: Message;
  isMine: boolean;
  isGrouped: boolean;
  showSenderName: boolean;
}) {
  const [showTime, setShowTime] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setShowTime(!showTime)}
      className={`mb-1 max-w-[80%] ${isMine ? "self-end items-end" : "self-start items-start"}`}
    >
      {!isMine && !isGrouped && showSenderName && (
        <Text className="text-gray-400 text-[11px] font-medium mb-1 ml-1">
          {message.sender.firstName}
        </Text>
      )}

      <View
        className={`px-4 py-2.5 shadow-sm ${
          isMine
            ? "bg-emerald-600 rounded-2xl rounded-tr-sm"
            : "bg-white rounded-2xl rounded-tl-sm border border-gray-100/50"
        }`}
        style={{
          shadowColor: isMine ? "#059669" : "#000000",
          shadowOpacity: isMine ? 0.15 : 0.04,
          shadowRadius: isMine ? 8 : 4,
          shadowOffset: { width: 0, height: isMine ? 4 : 2 },
          elevation: isMine ? 4 : 1,
        }}
      >
        <Text className={isMine ? "text-white" : "text-gray-800"}>
          {message.content}
        </Text>

        <View className="flex-row items-center justify-end mt-1">
          <Text
            className={`text-[9px] ${isMine ? "text-white/60" : "text-gray-400"}`}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isMine && (
            <View className="ml-1">
              <CheckCheck size={12} color="#ffffff" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    contactName?: string;
    contactPhoto?: string;
    contactStatus?: string;
    isGroup?: string;
  }>();
  const id = typeof params.id === "string" ? params.id : "";
  const isGroup = params.isGroup === "1";
  const router = useRouter();
  const { user } = useAuthStore();
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // ── Track which users are typing, by id → name (supports multiple in a group) ──
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    let socketRef: any = null;
    const typingTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

    const setup = async () => {
      try {
        const res = await Staff.getMessages(id);
        setMessages(res.data.data || []);
      } catch (err) {
        console.log("Messages load error:", err);
      } finally {
        setLoading(false);
      }

      const socket = await getSocket();
      socketRef = socket;
      socket.emit("join_conversation", id);

      socket.on("new_message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
        // clear typing indicator for whoever just sent a message
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[msg.senderId];
          return next;
        });
      });

      // ── Fixed: backend emits "user_typing" with { userId }, not "typing" ──
      socket.on("user_typing", ({ userId }: { userId: string }) => {
        if (userId === user?.id) return; // ignore our own typing echo

        // find the sender's name from recent messages, fallback to generic label
        const knownSender = messages.find((m) => m.senderId === userId)?.sender;
        const name = knownSender
          ? knownSender.firstName
          : isGroup
            ? "Someone"
            : (typeof params.contactName === "string" && params.contactName) ||
              "Someone";

        setTypingUsers((prev) => ({ ...prev, [userId]: name }));

        clearTimeout(typingTimeouts[userId]);
        typingTimeouts[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 2500);
      });

      socket.on("error", (err: { message: string }) => {
        console.log("Socket error:", err.message);
      });
    };

    setup();

    return () => {
      if (socketRef) {
        socketRef.emit("leave_conversation", id);
        socketRef.off("new_message");
        socketRef.off("user_typing");
        socketRef.off("error");
      }
      Object.values(typingTimeouts).forEach(clearTimeout);
      disconnectSocket();
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <View className="items-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-gray-400 text-sm mt-4 font-medium">
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const contactName =
    typeof params.contactName === "string" && params.contactName.trim()
      ? params.contactName
      : "Chat";
  const contactPhoto =
    typeof params.contactPhoto === "string" ? params.contactPhoto : "";
  const contactStatus =
    typeof params.contactStatus === "string" && params.contactStatus.trim()
      ? params.contactStatus
      : "Active now";

  const typingNames = Object.values(typingUsers);
  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : `${typingNames.length} people are typing...`;

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const existing = groupedMessages.find((g) => g.date === dateKey);
    if (existing) {
      existing.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const socket = await getSocket();
      socket.emit("send_message", {
        conversationId: id,
        content: input.trim(),
      });
      setInput("");
    } catch (error) {
      console.log("Send error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (input.trim().length > 0) {
      getSocket().then((socket) => {
        socket.emit("typing", id);
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <LinearGradient
        colors={["#0F766E", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12 }}
        className="mx-4 rounded-[28px] px-4 py-4"
      >
        <View className="px-3 pt-2 pb-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/15 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>

          <View className="flex-row items-center flex-1 mx-2">
            {contactPhoto ? (
              <Image
                source={{ uri: contactPhoto }}
                className="w-9 h-9 rounded-full border-2 border-white/30"
              />
            ) : isGroup ? (
              <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center border-2 border-white/30">
                <UsersIcon size={16} color="#ffffff" />
              </View>
            ) : (
              <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center border-2 border-white/30">
                <Text className="text-white font-semibold text-sm">
                  {contactName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "C"}
                </Text>
              </View>
            )}

            <View className="ml-2 flex-1">
              <Text
                className="text-white text-base font-semibold"
                numberOfLines={1}
              >
                {contactName}
              </Text>
              <View className="flex-row items-center mt-0.5">
                {!isGroup && (
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1.5" />
                )}
                <Text
                  className="text-white/70 text-xs font-medium"
                  numberOfLines={1}
                >
                  {typingLabel || contactStatus}
                </Text>
              </View>
            </View>
          </View>

          {!isGroup && (
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
                activeOpacity={0.7}
              >
                <Phone size={16} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
                activeOpacity={0.7}
              >
                <Video size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=60&w=800&auto=format&fit=crop&blur=60",
        }}
        resizeMode="cover"
        className="flex-1"
      >
        <View className="absolute inset-0 bg-white/80" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={groupedMessages}
            keyExtractor={(item) => item.date}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexGrow: 1,
            }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <View>
                <View className="items-center my-3">
                  <View className="bg-gray-200/80 px-4 py-1.5 rounded-full">
                    <Text className="text-gray-500 text-[10px] font-medium">
                      {formatDate(item.messages[0]?.createdAt || "")}
                    </Text>
                  </View>
                </View>

                {item.messages.map((msg: Message, index: number) => {
                  const isMine = msg.senderId === user?.id;
                  const prev = item.messages[index - 1];
                  const grouped = prev && prev.senderId === msg.senderId;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMine={isMine}
                      isGrouped={grouped}
                      showSenderName={isGroup}
                    />
                  );
                })}
              </View>
            )}
          />

          {typingLabel && (
            <View className="px-4 pb-2 flex-row items-center">
              <View className="bg-gray-200/80 px-4 py-2 rounded-2xl rounded-tl-sm">
                <Text className="text-gray-500 text-xs">{typingLabel}</Text>
              </View>
            </View>
          )}

          <View className="px-3 py-3 bg-white/95 border-t border-gray-100/80">
            <View className="flex-row items-end gap-2">
              <View className="flex-1 rounded-[24px] border border-gray-200 bg-white px-4 py-2 shadow-sm">
                <TextInput
                  ref={inputRef}
                  value={input}
                  onChangeText={(text) => {
                    setInput(text);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  placeholderTextColor="#94A3B8"
                  className="text-sm text-gray-800 py-1"
                  multiline
                  maxLength={500}
                  style={{ maxHeight: 120 }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSend}
                disabled={sending || !input.trim()}
                activeOpacity={0.85}
                className={`w-11 h-11 rounded-full items-center justify-center ${
                  input.trim() ? "bg-emerald-600" : "bg-gray-200"
                }`}
                style={{
                  shadowColor: input.trim() ? "#059669" : "transparent",
                  shadowOpacity: input.trim() ? 0.25 : 0,
                  shadowRadius: input.trim() ? 8 : 0,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: input.trim() ? 3 : 0,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send
                    size={17}
                    color={input.trim() ? "#ffffff" : "#94A3B8"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
