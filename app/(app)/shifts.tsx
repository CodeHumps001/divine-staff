// app/(app)/shifts.tsx — replaces the list rendering, keeps the same data loading
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
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
import { Staff } from "../../lib/api";

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

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
              My Shifts
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
