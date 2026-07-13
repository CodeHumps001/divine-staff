import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCheck, Phone, Send, Video } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { SafeAreaView } from "react-native-safe-area-context";
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

const { width } = Dimensions.get("window");

// ─── Time Formatter ────────────────────────────────────────────────
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Date Formatter ────────────────────────────────────────────────
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

// ─── Message Bubble ────────────────────────────────────────────────
function MessageBubble({
  message,
  isMine,
  isGrouped,
}: {
  message: Message;
  isMine: boolean;
  isGrouped: boolean;
}) {
  const [showTime, setShowTime] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setShowTime(!showTime)}
      className={`mb-1 max-w-[80%] ${isMine ? "self-end items-end" : "self-start items-start"}`}
    >
      {!isMine && !isGrouped && (
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
            className={`text-[9px] ${
              isMine ? "text-white/60" : "text-gray-400"
            }`}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isMine && (
            <View className="ml-1">
              <CheckCheck size={12} color={isMine ? "#ffffff" : "#94A3B8"} />
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
  }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user } = useAuthStore();
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // ─── ALL HOOKS MUST BE BEFORE ANY EARLY RETURN ──────────────────

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Socket connection and message loading
  useEffect(() => {
    let socketRef: any = null;
    let typingTimeout: ReturnType<typeof setTimeout> | undefined;

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
      });

      socket.on("typing", () => {
        setIsTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setIsTyping(false), 2000);
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
        socketRef.off("typing");
        socketRef.off("error");
      }
      clearTimeout(typingTimeout);
      disconnectSocket();
    };
  }, [id]);

  // ─── EARLY RETURN AFTER ALL HOOKS ──────────────────────────────

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

  // ─── COMPUTED VALUES ────────────────────────────────────────────

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

  // Group messages by date
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

  // ─── HANDLERS ────────────────────────────────────────────────────

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

  // ─── RENDER ──────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <View className="px-3 pt-2 pb-3 flex-row items-center bg-[#065F46]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/15 items-center justify-center"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center flex-1 mx-2"
          onPress={() => router.push({ pathname: "/(app)/profile" })}
        >
          {contactPhoto ? (
            <Image
              source={{ uri: contactPhoto }}
              className="w-9 h-9 rounded-full border-2 border-white/30"
            />
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
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1.5" />
              <Text
                className="text-white/70 text-xs font-medium"
                numberOfLines={1}
              >
                {isTyping ? "typing..." : contactStatus}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

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
      </View>

      {/* ─── CHAT AREA ────────────────────────────────────────────── */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=800&auto=format&fit=crop",
        }}
        resizeMode="cover"
        className="flex-1"
      >
        <View className="absolute inset-0 bg-white/90" />

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
                {/* Date Separator */}
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
                    />
                  );
                })}
              </View>
            )}
          />

          {/* ─── TYPING INDICATOR ────────────────────────────────── */}
          {isTyping && (
            <View className="px-4 pb-2 flex-row items-center">
              <View className="bg-gray-200/80 px-4 py-2 rounded-2xl rounded-tl-sm">
                <Text className="text-gray-500 text-xs">typing...</Text>
              </View>
            </View>
          )}

          {/* ─── INPUT BAR ────────────────────────────────────────── */}
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
