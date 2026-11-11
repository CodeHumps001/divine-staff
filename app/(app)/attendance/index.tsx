// app/(app)/attendance/index.tsx
import { useTabBarSafeBottomPadding } from "@/lib/useTabBarHeight";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { ArrowLeft, Clock } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";

type AttendanceRecord = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT";
  shift: {
    date: string;
    shiftType: { name: string; startTime: string; endTime: string };
  };
};

const STATUS_STYLES: Record<
  AttendanceRecord["status"],
  { bg: string; text: string; label: string }
> = {
  PRESENT: { bg: "bg-green-50", text: "text-green-600", label: "Present" },
  LATE: { bg: "bg-amber-50", text: "text-amber-600", label: "Late" },
  ABSENT: { bg: "bg-red-50", text: "text-red-600", label: "Absent" },
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tabBarSafeBottom = useTabBarSafeBottomPadding();

  const loadRecords = useCallback(async () => {
    try {
      const res = await Staff.getMyAttendance();
      const data: AttendanceRecord[] = res.data.data || [];
      // most recent first
      data.sort(
        (a, b) =>
          new Date(b.shift.date).getTime() - new Date(a.shift.date).getTime(),
      );
      setRecords(data);
    } catch (err) {
      console.log("Attendance load error:", err);
      setLoadError(
        err instanceof Error
          ? err.message
          : "Could not load attendance records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    setLoadError(null);
    loadRecords();
  };

  // ── This month's summary ──
  const monthStats = useMemo(() => {
    const now = new Date();
    const thisMonth = records.filter((r) => {
      const d = new Date(r.shift.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const present = thisMonth.filter((r) => r.status === "PRESENT").length;
    const late = thisMonth.filter((r) => r.status === "LATE").length;
    const absent = thisMonth.filter((r) => r.status === "ABSENT").length;
    return { total: thisMonth.length, present, late, absent };
  }, [records]);

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
        <View className="flex-row items-center p-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-base font-semibold">
              My Attendance
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarSafeBottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loadError && (
          <View className="mx-6 mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
            <Text className="text-sm font-medium text-red-700">
              Could not load attendance
            </Text>
            <Text className="mt-1 text-xs text-red-600">{loadError}</Text>
            <TouchableOpacity
              onPress={onRefresh}
              className="mt-3 self-start rounded-xl bg-red-100 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-red-700">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Monthly summary ── */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 flex-row shadow-sm">
          <SummaryStat
            label="Present"
            value={monthStats.present}
            color="text-green-600"
          />
          <SummaryStat
            label="Late"
            value={monthStats.late}
            color="text-amber-600"
          />
          <SummaryStat
            label="Absent"
            value={monthStats.absent}
            color="text-red-600"
          />
        </View>

        {/* ── History list ── */}
        <View className="mx-6 mt-6">
          <Text className="text-gray-900 font-semibold mb-3">History</Text>

          {records.length === 0 ? (
            <View className="items-center py-16">
              <Clock size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No attendance records yet
              </Text>
            </View>
          ) : (
            records.map((r) => {
              const style = STATUS_STYLES[r.status];
              return (
                <View
                  key={r.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {new Date(r.shift.date).toDateString()}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {r.shift.shiftType.name} · {formatTime(r.clockIn)} –{" "}
                      {formatTime(r.clockOut)}
                    </Text>
                  </View>
                  <View className={`px-3 py-1.5 rounded-full ${style.bg}`}>
                    <Text className={`text-xs font-semibold ${style.text}`}>
                      {style.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 px-6">
      <Text className="text-center text-base font-semibold text-gray-900">
        Attendance could not be displayed
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        {error.message}
      </Text>
      <TouchableOpacity
        onPress={retry}
        className="mt-5 rounded-xl bg-[#006B3C] px-5 py-3"
      >
        <Text className="font-semibold text-white">Try again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className={`text-xl font-bold ${color}`}>{value}</Text>
      <Text className="text-gray-400 text-xs mt-0.5">{label}</Text>
    </View>
  );
}
