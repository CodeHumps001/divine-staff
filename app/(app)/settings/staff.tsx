import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, ShieldAlert, UserX, X } from "lucide-react-native";
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
import { Auth, Staff } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  position: string;
  isActive: boolean;
  department?: { id: string; name: string } | null;
};

type Department = { id: string; name: string };

const ROLES = ["STAFF", "DEPT_HEAD", "SUPER_ADMIN"];
const POSITIONS = [
  "DOCTOR",
  "NURSE",
  "MIDWIFE",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "RECEPTIONIST",
  "ADMINISTRATOR",
  "OTHER",
];

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
                  maxHeight: "88%",
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

export default function StaffManagementScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/(app)/dashboard");
  }, [isSuperAdmin]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [position, setPosition] = useState("NURSE");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [staffRes, deptRes] = await Promise.all([
        Staff.getAllStaff(),
        Staff.getDepartments(),
      ]);
      setStaffList(staffRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      console.log("Staff/departments load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setPosition("NURSE");
    setDepartmentId(null);
  };

  const handleCreate = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      await Auth.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
        position,
        departmentId: departmentId || undefined,
      });
      setFormOpen(false);
      resetForm();
      loadData();
      Alert.alert(
        "Success",
        "Staff account created. They'll receive their login details by email.",
      );
    } catch (err: any) {
      Alert.alert(
        "Couldn't create account",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = (staff: StaffMember) => {
    Alert.alert(
      "Deactivate account",
      `Deactivate ${staff.firstName} ${staff.lastName}? They will no longer be able to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await Staff.deactivateStaff(staff.id);
              loadData();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Couldn't deactivate",
              );
            }
          },
        },
      ],
    );
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
        <View className="flex-row items-center justify-between p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">Staff</Text>
          </View>
          <TouchableOpacity
            onPress={() => setFormOpen(true)}
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
          {staffList.map((s) => (
            <View
              key={s.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 mb-2 flex-row items-center"
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <Text className="text-[#006B3C] font-bold text-sm">
                  {s.firstName.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">
                  {s.firstName} {s.lastName}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {s.position} · {s.department?.name || "No department"} ·{" "}
                  {s.role}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeactivate(s)}
                className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
              >
                <UserX size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add Staff"
      >
        <Text className="text-gray-700 text-sm font-medium mb-1.5">
          First Name
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Jane"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
        />
        <Text className="text-gray-700 text-sm font-medium mb-1.5">
          Last Name
        </Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
        />
        <Text className="text-gray-700 text-sm font-medium mb-1.5">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="jane@divinenetcare.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
        />
        <Text className="text-gray-700 text-sm font-medium mb-1.5">
          Temporary Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
        />

        <Text className="text-gray-700 text-sm font-medium mb-2">Role</Text>
        <View className="flex-row gap-2 mb-4">
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              className={`px-3 py-2 rounded-xl ${role === r ? "bg-[#006B3C]" : "bg-gray-100"}`}
            >
              <Text
                className={`text-xs font-medium ${role === r ? "text-white" : "text-gray-600"}`}
              >
                {r.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-700 text-sm font-medium mb-2">Position</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPosition(p)}
              className={`px-3 py-2 rounded-xl mr-2 ${position === p ? "bg-[#006B3C]" : "bg-gray-100"}`}
            >
              <Text
                className={`text-xs font-medium ${position === p ? "text-white" : "text-gray-600"}`}
              >
                {p.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="text-gray-700 text-sm font-medium mb-2">
          Department
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {departments.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setDepartmentId(d.id)}
              className={`px-3 py-2 rounded-xl mr-2 ${
                departmentId === d.id ? "bg-[#006B3C]" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  departmentId === d.id ? "text-white" : "text-gray-600"
                }`}
              >
                {d.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating}
          className={`rounded-xl py-4 items-center justify-center ${
            creating ? "bg-green-300" : "bg-[#006B3C]"
          }`}
        >
          {creating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Create Account
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
