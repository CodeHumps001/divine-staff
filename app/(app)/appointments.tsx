import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Mail,
  Phone,
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
import { Staff } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | null;
  reason: string;
  date: string;
  status: AppointmentStatus;
};

const STATUS_STYLES: Record<
  AppointmentStatus,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-600", label: "Confirmed" },
  COMPLETED: { bg: "bg-green-50", text: "text-green-600", label: "Completed" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-600", label: "Cancelled" },
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isDoctor = user?.position === "DOCTOR";

  useEffect(() => {
    if (!isDoctor) router.replace("/(app)/dashboard");
  }, [isDoctor]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!isDoctor) return;
    try {
      const res = await Staff.getMyAppointments();
      const data: Appointment[] = res.data.data || [];
      data.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setAppointments(data);
    } catch (err) {
      console.log("Appointments load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDoctor]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      await Staff.updateAppointmentStatus(id, status as any);
      loadAppointments();
    } catch (err: any) {
      Alert.alert(
        "Couldn't update",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isDoctor) {
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

  const pendingCount = appointments.filter(
    (a) => a.status === "PENDING",
  ).length;

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
              My Appointments {pendingCount > 0 ? `(${pendingCount})` : ""}
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
          {appointments.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <Calendar size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No appointments yet
              </Text>
            </View>
          ) : (
            appointments.map((a) => {
              const style = STATUS_STYLES[a.status] || STATUS_STYLES.PENDING;
              const isUpdating = updatingId === a.id;

              return (
                <View
                  key={a.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-gray-900 font-semibold">
                      {a.patientName}
                    </Text>
                    <View className={`px-3 py-1 rounded-full ${style.bg}`}>
                      <Text className={`text-xs font-semibold ${style.text}`}>
                        {style.label}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-sm">
                    {new Date(a.date).toDateString()}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">{a.reason}</Text>

                  <View className="flex-row items-center mt-2 gap-4">
                    <View className="flex-row items-center">
                      <Phone size={12} color="#9CA3AF" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {a.patientPhone}
                      </Text>
                    </View>
                    {!!a.patientEmail && (
                      <View className="flex-row items-center">
                        <Mail size={12} color="#9CA3AF" />
                        <Text className="text-gray-400 text-xs ml-1">
                          {a.patientEmail}
                        </Text>
                      </View>
                    )}
                  </View>

                  {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                    <View className="flex-row gap-2 mt-3">
                      {a.status === "PENDING" && (
                        <TouchableOpacity
                          onPress={() => handleUpdateStatus(a.id, "CONFIRMED")}
                          disabled={isUpdating}
                          className="flex-1 bg-[#006B3C] rounded-xl py-2.5 items-center flex-row justify-center"
                        >
                          {isUpdating ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <Check size={14} color="#ffffff" />
                              <Text className="text-white text-sm font-semibold ml-1.5">
                                Confirm
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      {a.status === "CONFIRMED" && (
                        <TouchableOpacity
                          onPress={() => handleUpdateStatus(a.id, "COMPLETED")}
                          disabled={isUpdating}
                          className="flex-1 bg-[#006B3C] rounded-xl py-2.5 items-center flex-row justify-center"
                        >
                          {isUpdating ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <Check size={14} color="#ffffff" />
                              <Text className="text-white text-sm font-semibold ml-1.5">
                                Mark Complete
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert(
                            "Cancel appointment",
                            `Cancel ${a.patientName}'s appointment?`,
                            [
                              { text: "No", style: "cancel" },
                              {
                                text: "Yes, cancel",
                                style: "destructive",
                                onPress: () =>
                                  handleUpdateStatus(a.id, "CANCELLED"),
                              },
                            ],
                          )
                        }
                        disabled={isUpdating}
                        className="flex-1 bg-red-50 rounded-xl py-2.5 items-center flex-row justify-center"
                      >
                        <X size={14} color="#DC2626" />
                        <Text className="text-red-600 text-sm font-semibold ml-1.5">
                          Cancel
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
    </SafeAreaView>
  );
}
