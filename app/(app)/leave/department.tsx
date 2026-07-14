// app/(app)/leave/department.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  FileText,
  ShieldAlert,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

type LeaveApplication = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    position: string;
    department: { name: string };
  };
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
  APPROVED: { bg: "bg-green-50", text: "text-green-600", label: "Approved" },
  REJECTED: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
};

export default function DepartmentLeaveScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canReview = user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!canReview) router.replace("/(app)/leave");
  }, [canReview]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);

  const [reviewTarget, setReviewTarget] = useState<LeaveApplication | null>(
    null,
  );
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const loadLeaves = useCallback(async () => {
    try {
      const res = await Staff.getDepartmentLeave();
      const data: LeaveApplication[] = res.data.data || [];
      data.sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (b.status === "PENDING" && a.status !== "PENDING") return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setLeaves(data);
    } catch (err) {
      console.log("Department leave load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canReview) loadLeaves();
  }, [loadLeaves, canReview]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves();
  };

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      await Staff.reviewLeave(
        reviewTarget.id,
        status,
        reviewNote.trim() || undefined,
      );
      setReviewTarget(null);
      setReviewNote("");
      loadLeaves();
    } catch (err: any) {
      Alert.alert(
        "Couldn't review",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setReviewing(false);
    }
  };

  if (!canReview) {
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

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
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
              Leave Requests {pendingCount > 0 ? `(${pendingCount})` : ""}
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
          {leaves.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <FileText size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No leave requests
              </Text>
            </View>
          ) : (
            leaves.map((l) => {
              const style = STATUS_STYLES[l.status];
              return (
                <View
                  key={l.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-gray-900 font-semibold">
                      {l.user.firstName} {l.user.lastName}
                    </Text>
                    <View className={`px-3 py-1 rounded-full ${style.bg}`}>
                      <Text className={`text-xs font-semibold ${style.text}`}>
                        {style.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-xs mb-2">
                    {l.user.position}
                  </Text>

                  <Text className="text-gray-700 text-sm font-medium">
                    {l.leaveType.charAt(0) + l.leaveType.slice(1).toLowerCase()}{" "}
                    Leave
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {new Date(l.startDate).toDateString()} →{" "}
                    {new Date(l.endDate).toDateString()}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">{l.reason}</Text>

                  {l.status === "PENDING" && (
                    <View className="flex-row gap-2 mt-3">
                      <TouchableOpacity
                        onPress={() => {
                          setReviewTarget(l);
                          setReviewNote("");
                        }}
                        className="flex-1 bg-[#006B3C] rounded-xl py-2.5 items-center"
                      >
                        <Text className="text-white text-sm font-semibold">
                          Review
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!reviewTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewTarget(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-8">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-gray-900 text-lg font-bold">
                Review Leave
              </Text>
              <TouchableOpacity onPress={() => setReviewTarget(null)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-sm mb-1">
              {reviewTarget?.user.firstName} {reviewTarget?.user.lastName}
            </Text>
            <Text className="text-gray-900 font-medium mb-4">
              {reviewTarget && new Date(reviewTarget.startDate).toDateString()}{" "}
              → {reviewTarget && new Date(reviewTarget.endDate).toDateString()}
            </Text>

            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Note (optional)
            </Text>
            <TextInput
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="Add a note for the staff member..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-5"
              style={{ textAlignVertical: "top", minHeight: 90 }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => handleReview("REJECTED")}
                disabled={reviewing}
                className="flex-1 bg-red-50 rounded-xl py-4 items-center justify-center flex-row"
              >
                <X size={16} color="#DC2626" />
                <Text className="text-red-600 font-semibold ml-1.5">
                  Reject
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReview("APPROVED")}
                disabled={reviewing}
                className="flex-1 bg-[#006B3C] rounded-xl py-4 items-center justify-center flex-row"
              >
                {reviewing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" />
                    <Text className="text-white font-semibold ml-1.5">
                      Approve
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
