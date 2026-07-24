// app/(app)/shifts.tsx
import { Staff } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Notebook,
  Settings2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Shift = {
  id: string;
  date: string;
  shiftType: { name: string; startTime: string; endTime: string };
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const shiftDotColor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("off")) return "#D1D5DB";
  if (n.includes("night")) return "#6366F1";
  if (n.includes("afternoon")) return "#F59E0B";
  return "#006B3C";
};

export default function ShiftsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManageShifts =
    user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const insets = useSafeAreaInsets();

  const loadShifts = useCallback(async () => {
    try {
      const res = await Staff.getMyShifts();
      setShifts(res.data.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
  };

  const shiftsByDay = useMemo(() => {
    const map: Record<string, Shift> = {};
    shifts.forEach((s) => {
      map[new Date(s.date).toDateString()] = s;
    });
    return map;
  }, [shifts]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [viewMonth]);

  const selectedShift = shiftsByDay[selectedDate.toDateString()];

  const handleExportPdf = async () => {
    if (shifts.length === 0) {
      Alert.alert("No shifts", "There are no shifts to export yet.");
      return;
    }
    setExporting(true);
    try {
      const rows = [...shifts]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(
          (s) => `
          <tr>
            <td>${new Date(s.date).toDateString()}</td>
            <td>${s.shiftType.name}</td>
            <td>${s.shiftType.startTime} – ${s.shiftType.endTime}</td>
          </tr>`,
        )
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { color: #006B3C; font-size: 20px; margin-bottom: 4px; }
              .subtitle { color: #6B7280; font-size: 12px; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; }
              th { text-align: left; background: #ECFDF5; color: #006B3C; padding: 10px 12px; font-size: 12px; }
              td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F3F4F6; }
              tr:nth-child(even) { background: #FAFAFA; }
            </style>
          </head>
          <body>
            <h1>Divine Netcare — Shift Schedule</h1>
            <div class="subtitle">
              ${user?.firstName || ""} ${user?.lastName || ""} · Generated ${new Date().toDateString()}
            </div>
            <table>
              <thead>
                <tr><th>Date</th><th>Shift</th><th>Time</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Shift Schedule",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Exported", `PDF saved at: ${uri}`);
      }
    } catch (err) {
      console.log("PDF export error:", err);
      Alert.alert(
        "Export failed",
        "Couldn't generate the PDF. Please try again.",
      );
    } finally {
      setExporting(false);
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
          <View className="flex-1 items-center">
            <Text className="text-white text-base font-semibold">
              My Shifts
            </Text>
          </View>
          <View className="flex-row items-center gap-2   right-5">
            {canManageShifts && (
              <TouchableOpacity
                onPress={() => router.push("/(app)/shifts/generate")}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/15 mr-2"
              >
                <Settings2 size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleExportPdf}
              disabled={exporting}
              className="w-10 h-10 rounded-full items-center justify-center bg-white/15"
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Download size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(app)/shifts/swap")}
              className="w-10 h-10 rounded-full items-center justify-center bg-white/15 mr-2"
            >
              <ArrowLeftRight size={18} color="#ffffff" />
            </TouchableOpacity>
            {(user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN") && (
              <TouchableOpacity
                onPress={() => router.push("/(app)/shifts/swap-review")}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/15 mr-2"
              >
                <Notebook size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
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
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          {/* month switcher */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() =>
                setViewMonth(
                  new Date(
                    viewMonth.getFullYear(),
                    viewMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              <ChevronLeft size={20} color="#006B3C" />
            </TouchableOpacity>
            <Text className="text-gray-900 font-semibold">
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setViewMonth(
                  new Date(
                    viewMonth.getFullYear(),
                    viewMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              <ChevronRight size={20} color="#006B3C" />
            </TouchableOpacity>
          </View>

          {/* weekday labels */}
          <View className="flex-row mb-2">
            {WEEKDAYS.map((d, i) => (
              <View key={i} className="flex-1 items-center">
                <Text className="text-gray-400 text-xs font-medium">{d}</Text>
              </View>
            ))}
          </View>

          {/* day grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((date, i) => {
              if (!date)
                return (
                  <View key={i} style={{ width: "14.28%" }} className="h-12" />
                );

              const shift = shiftsByDay[date.toDateString()];
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <TouchableOpacity
                  key={i}
                  style={{ width: "14.28%" }}
                  className="h-12 items-center justify-center"
                  onPress={() => setSelectedDate(date)}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      isSelected ? "bg-[#006B3C]" : isToday ? "bg-green-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "text-white font-semibold"
                          : "text-gray-900"
                      }`}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  {shift && (
                    <View
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{
                        backgroundColor: isSelected
                          ? "#ffffff"
                          : shiftDotColor(shift.shiftType.name),
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* selected day detail */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100">
          <Text className="text-gray-900 font-semibold mb-2">
            {selectedDate.toDateString()}
          </Text>
          {selectedShift ? (
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{
                  backgroundColor: shiftDotColor(selectedShift.shiftType.name),
                }}
              />
              <Text className="text-gray-700 text-sm">
                {selectedShift.shiftType.name} ·{" "}
                {selectedShift.shiftType.startTime}–
                {selectedShift.shiftType.endTime}
              </Text>
            </View>
          ) : (
            <Text className="text-gray-400 text-sm">No shift scheduled</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
