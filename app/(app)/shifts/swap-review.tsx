import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Check,
  ShieldAlert,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

type Department = { id: string; name: string };
type ShiftInfo = {
  id: string;
  date: string;
  shiftType: { name: string; startTime: string; endTime: string };
};
type SwapRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requester: { firstName: string; lastName: string };
  targetStaff: { firstName: string; lastName: string };
  originalShift: ShiftInfo;
  targetShift: ShiftInfo;
};

export default function SwapReviewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const canReview = user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";
  const isSuperAdminRole = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!canReview) router.replace("/(app)/shifts");
  }, [canReview]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdminRole) return;
    Staff.getDepartments()
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.log("Departments load error:", err));
  }, [isSuperAdminRole]);

  const loadRequests = useCallback(async () => {
    if (isSuperAdminRole && !selectedDeptId) {
      setLoading(false);
      setRequests([]);
      return;
    }
    try {
      const res = await Staff.getDepartmentSwapRequests(
        isSuperAdminRole ? selectedDeptId! : undefined,
      );
      setRequests(res.data.data || []);
    } catch (err) {
      console.log("Swap requests load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdminRole, selectedDeptId]);

  useEffect(() => {
    if (canReview) {
      setLoading(true);
      loadRequests();
    }
  }, [loadRequests, canReview]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewingId(id);
    try {
      await Staff.reviewSwapRequest(id, status);
      loadRequests();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Couldn't update request",
      );
    } finally {
      setReviewingId(null);
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

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
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
              Swap Requests {pendingCount > 0 ? `(${pendingCount})` : ""}
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
        {isSuperAdminRole && (
          <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Building2 size={16} color="#006B3C" />
              <Text className="text-gray-900 font-semibold ml-2">
                Department
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {departments.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setSelectedDeptId(d.id)}
                  className={`px-4 py-2 rounded-xl mr-2 ${
                    selectedDeptId === d.id ? "bg-[#006B3C]" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedDeptId === d.id ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mx-6 mt-6">
          {isSuperAdminRole && !selectedDeptId ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <Building2 size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3 text-center px-6">
                Select a department above to view swap requests
              </Text>
            </View>
          ) : requests.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <ArrowLeftRight size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No swap requests
              </Text>
            </View>
          ) : (
            requests.map((r) => (
              <View
                key={r.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
              >
                <Text className="text-gray-900 font-semibold mb-2">
                  {r.requester.firstName} {r.requester.lastName} ↔{" "}
                  {r.targetStaff.firstName} {r.targetStaff.lastName}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {r.requester.firstName}'s shift:{" "}
                  {new Date(r.originalShift.date).toDateString()} ·{" "}
                  {r.originalShift.shiftType.name}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Swapping for: {new Date(r.targetShift.date).toDateString()} ·{" "}
                  {r.targetShift.shiftType.name}
                </Text>

                {r.status === "PENDING" && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() => handleReview(r.id, "REJECTED")}
                      disabled={reviewingId === r.id}
                      className="flex-1 bg-red-50 rounded-xl py-2.5 items-center flex-row justify-center"
                    >
                      <X size={14} color="#DC2626" />
                      <Text className="text-red-600 text-sm font-semibold ml-1.5">
                        Reject
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReview(r.id, "APPROVED")}
                      disabled={reviewingId === r.id}
                      className="flex-1 bg-[#006B3C] rounded-xl py-2.5 items-center flex-row justify-center"
                    >
                      {reviewingId === r.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Check size={14} color="#ffffff" />
                          <Text className="text-white text-sm font-semibold ml-1.5">
                            Approve
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
