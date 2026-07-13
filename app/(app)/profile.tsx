// app/(app)/profile.tsx
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  LogOut,
  Mail,
  Phone,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Staff } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(user?.profile?.phone || "");
  const [bio, setBio] = useState(user?.profile?.bio || "");
  const [photoUrl, setPhotoUrl] = useState(user?.profile?.photoUrl || "");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setLocalImageUri(result.assets[0].uri); // preview immediately
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (localImageUri) {
        const formData = new FormData();
        formData.append("image", {
          uri: localImageUri,
          type: "image/jpeg",
          name: "profile.jpg",
        } as any);
        const uploadRes = await Staff.uploadImage(formData);
        finalPhotoUrl = uploadRes.data.data.url; // adjust to your actual response shape
      }
      await Staff.updateProfile({ phone, bio, photoUrl: finalPhotoUrl });
      setPhotoUrl(finalPhotoUrl);
      // update the store locally so the change reflects immediately
      useAuthStore.setState((s) => ({
        user: {
          ...s.user,
          profile: { ...s.user?.profile, phone, bio, photoUrl: finalPhotoUrl },
        },
      }));
      setEditOpen(false);
    } catch (err: any) {
      Alert.alert(
        "Couldn't save",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const initials = `${user?.firstName?.[0] || ""}${
    user?.lastName?.[0] || ""
  }`.toUpperCase();
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Staff Member";

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7F6]" edges={["top", "bottom"]}>
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
              My Profile
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 36,
        }}
      >
        <View
          className="rounded-[28px] border border-gray-100 bg-white p-4"
          style={{
            shadowColor: "#0F172A",
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={pickImage} className="items-center">
              <View className="w-20 h-20 rounded-full items-center justify-center overflow-hidden border-[3px] border-emerald-100 bg-emerald-50">
                {localImageUri || photoUrl ? (
                  <Image
                    source={{ uri: localImageUri || photoUrl }}
                    className="w-full h-full"
                  />
                ) : (
                  <Text className="text-emerald-700 text-lg font-semibold">
                    {initials || "U"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View className="flex-1 ml-4">
              <Text className="text-gray-900 text-lg font-semibold">
                {fullName}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {user?.department?.name || "Department not set"}
              </Text>
              <View className="mt-2 self-start rounded-full bg-emerald-50 px-3 py-1">
                <Text className="text-emerald-700 text-[11px] font-semibold">
                  Profile ready
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setEditOpen(true)}
              className="rounded-full bg-gray-100 px-3 py-2"
            >
              <Text className="text-gray-700 text-[12px] font-semibold">
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 h-px bg-gray-100" />

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 rounded-[18px] bg-slate-50 p-3">
              <Text className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">
                Email
              </Text>
              <Text className="text-gray-700 text-sm font-medium mt-1">
                {user?.email || "—"}
              </Text>
            </View>
            <View className="flex-1 rounded-[18px] bg-emerald-50 p-3">
              <Text className="text-emerald-600 text-[10px] font-semibold uppercase tracking-[0.2em]">
                Status
              </Text>
              <Text className="text-emerald-700 text-sm font-medium mt-1">
                Active
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-[28px] border border-gray-100 bg-white p-4">
          <Text className="text-gray-900 font-semibold mb-3">
            Account details
          </Text>
          <InfoRow
            icon={<Mail size={16} color="#0F766E" />}
            label="Email"
            value={user?.email}
          />
          <InfoRow
            icon={<Phone size={16} color="#0F766E" />}
            label="Phone"
            value={user?.profile?.phone || "Not set"}
          />
          <InfoRow
            icon={<Building2 size={16} color="#0F766E" />}
            label="Department"
            value={user?.department?.name || "—"}
          />
          <InfoRow
            icon={<Briefcase size={16} color="#0F766E" />}
            label="Role"
            value={user?.role}
            isLast
          />
        </View>

        {!!user?.profile?.bio && (
          <View className="mt-5 rounded-[24px] border border-gray-100 bg-white p-4">
            <Text className="text-gray-900 font-semibold mb-2">About</Text>
            <Text className="text-gray-500 text-sm leading-5">
              {user.profile.bio}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          className="mt-5 flex-row items-center justify-center rounded-[22px] border border-red-100 bg-red-50 p-4"
        >
          <LogOut size={18} color="#DC2626" />
          <Text className="ml-2 font-semibold text-red-600">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit modal ── */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-gray-900 text-lg font-bold">
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Phone
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0244123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                returnKeyType="next"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
              />

              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Photo URL
              </Text>
              <TextInput
                value={photoUrl}
                onChangeText={setPhotoUrl}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                returnKeyType="next"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
              />

              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Bio
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="A short bio about yourself"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                returnKeyType="done"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-5"
                style={{ textAlignVertical: "top", minHeight: 108 }}
              />

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`rounded-xl py-4 items-center justify-center ${
                  saving ? "bg-green-300" : "bg-[#006B3C]"
                }`}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-gray-400 text-xs">{label}</Text>
        <Text className="text-gray-900 text-sm font-medium mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}
