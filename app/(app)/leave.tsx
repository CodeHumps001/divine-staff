// app/(app)/leave.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, FileText, Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Staff } from "../../lib/api";

type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "MATERNITY" | "PATERNITY";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

type LeaveApplication = {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewNote?: string | null;
  createdAt: string;
};

const LEAVE_TYPES: LeaveType[] = [
  "ANNUAL",
  "SICK",
  "EMERGENCY",
  "MATERNITY",
  "PATERNITY",
];

const STATUS_STYLES: Record<
  LeaveStatus,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
  APPROVED: { bg: "bg-green-50", text: "text-green-600", label: "Approved" },
  REJECTED: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
};

const fmtDate = (d: Date) => d.toISOString().split("T")[0]; // "YYYY-MM-DD"

export default function LeaveScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");

  const loadLeaves = useCallback(async () => {
    try {
      const res = await Staff.getMyLeave();
      const data: LeaveApplication[] = res.data.data || [];
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setLeaves(data);
    } catch (err) {
      console.log("Leave load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves();
  };

  const resetForm = () => {
    setLeaveType("ANNUAL");
    setStartDate(new Date());
    setEndDate(new Date());
    setReason("");
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing info", "Please add a reason for your leave.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be after start date.");
      return;
    }
    setSubmitting(true);
    try {
      await Staff.applyLeave({
        leaveType,
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        reason: reason.trim(),
      });
      setFormOpen(false);
      resetForm();
      loadLeaves();
    } catch (err: any) {
      // backend surfaces specific messages: insufficient balance,
      // overlapping application, no balance found for this leave type
      Alert.alert(
        "Couldn't submit",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setSubmitting(false);
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#0F766E", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mx-4 mt-3 rounded-[28px] px-4 py-4"
      >
        <View className="flex-row items-center justify-between p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">Leave</Text>
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
          <TouchableOpacity
            onPress={() => setFormOpen(true)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center justify-center"
          >
            <Plus size={18} color="#006B3C" />
            <Text className="text-[#006B3C] font-semibold ml-2">
              Request Leave
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mx-6 mt-6">
          <Text className="text-gray-900 font-semibold mb-3">My Requests</Text>

          {leaves.length === 0 ? (
            <View className="items-center py-16">
              <FileText size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No leave requests yet
              </Text>
            </View>
          ) : (
            leaves.map((l) => {
              const style = STATUS_STYLES[l.status];
              return (
                <View
                  key={l.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-2"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-gray-900 font-semibold capitalize">
                      {l.leaveType.charAt(0) +
                        l.leaveType.slice(1).toLowerCase()}{" "}
                      Leave
                    </Text>
                    <View className={`px-3 py-1 rounded-full ${style.bg}`}>
                      <Text className={`text-xs font-semibold ${style.text}`}>
                        {style.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-500 text-sm">
                    {new Date(l.startDate).toDateString()} →{" "}
                    {new Date(l.endDate).toDateString()}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">{l.reason}</Text>
                  {!!l.reviewNote && (
                    <View className="bg-gray-50 rounded-xl px-3 py-2 mt-2">
                      <Text className="text-gray-500 text-xs">
                        Reviewer note: {l.reviewNote}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── New leave request modal ── */}
      <Modal
        visible={formOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFormOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback onPress={() => {}}>
              <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-6 max-h-[88%]">
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="text-gray-900 text-lg font-bold">
                    Request Leave
                  </Text>
                  <TouchableOpacity onPress={() => setFormOpen(false)}>
                    <X size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  <Text className="text-gray-700 text-sm font-medium mb-2">
                    Leave Type
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-5"
                  >
                    {LEAVE_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setLeaveType(type)}
                        className={`px-4 py-2.5 rounded-xl mr-2 ${
                          leaveType === type ? "bg-[#006B3C]" : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            leaveType === type ? "text-white" : "text-gray-600"
                          }`}
                        >
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm font-medium mb-1.5">
                        Start Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5"
                      >
                        <Calendar size={16} color="#6B7280" />
                        <Text className="ml-2 text-gray-900 text-sm">
                          {fmtDate(startDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm font-medium mb-1.5">
                        End Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowEndPicker(true)}
                        className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5"
                      >
                        <Calendar size={16} color="#6B7280" />
                        <Text className="ml-2 text-gray-900 text-sm">
                          {fmtDate(endDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(_, date) => {
                        setShowStartPicker(Platform.OS === "ios");
                        if (date) setStartDate(date);
                      }}
                    />
                  )}
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(_, date) => {
                        setShowEndPicker(Platform.OS === "ios");
                        if (date) setEndDate(date);
                      }}
                    />
                  )}

                  <Text className="text-gray-700 text-sm font-medium mb-1.5">
                    Reason
                  </Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Briefly explain your reason for leave"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-5"
                    style={{ textAlignVertical: "top", minHeight: 108 }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      handleSubmit();
                    }}
                    disabled={submitting}
                    className={`rounded-xl py-4 items-center justify-center ${
                      submitting ? "bg-green-300" : "bg-[#006B3C]"
                    }`}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text className="text-white font-semibold text-base">
                        Submit Request
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
