// app/(app)/shifts/swap.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

type ColleagueShift = {
  id: string;
  date: string;
  shiftType: { name: string; startTime: string; endTime: string };
  user: { id: string; firstName: string; lastName: string };
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
  APPROVED: { bg: "bg-green-50", text: "text-green-600", label: "Approved" },
  REJECTED: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
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

// ── Reusable compact calendar that highlights only dates with a shift ──
function MiniCalendar({
  shiftsByDay,
  selectedId,
  onSelect,
  accentColor = "#006B3C",
}: {
  shiftsByDay: Record<string, { id: string; date: string }>;
  selectedId: string | null;
  onSelect: (shiftId: string, dateKey: string) => void;
  accentColor?: string;
}) {
  const [viewMonth, setViewMonth] = useState(new Date());

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

  return (
    <View className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <TouchableOpacity
          onPress={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
            )
          }
        >
          <ChevronLeft size={18} color={accentColor} />
        </TouchableOpacity>
        <Text className="text-gray-900 text-sm font-semibold">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={() =>
            setViewMonth(
              new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
            )
          }
        >
          <ChevronRight size={18} color={accentColor} />
        </TouchableOpacity>
      </View>

      <View className="flex-row mb-1">
        {WEEKDAYS.map((d, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-gray-400 text-[10px] font-medium">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {calendarDays.map((date, i) => {
          if (!date)
            return (
              <View key={i} style={{ width: "14.28%" }} className="h-10" />
            );

          const dateKey = date.toDateString();
          const shift = shiftsByDay[dateKey];
          const isSelected = shift && selectedId === shift.id;
          const hasShift = !!shift;

          return (
            <TouchableOpacity
              key={i}
              style={{ width: "14.28%" }}
              className="h-10 items-center justify-center"
              disabled={!hasShift}
              onPress={() => hasShift && onSelect(shift.id, dateKey)}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isSelected
                    ? accentColor
                    : hasShift
                      ? `${accentColor}18`
                      : "transparent",
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: isSelected
                      ? "#ffffff"
                      : hasShift
                        ? accentColor
                        : "#D1D5DB",
                    fontWeight: hasShift ? "600" : "400",
                  }}
                >
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ShiftSwapScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<SwapRequest[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [myShifts, setMyShifts] = useState<ShiftInfo[]>([]);
  const [colleagueShifts, setColleagueShifts] = useState<ColleagueShift[]>([]);

  const [selectedMyShift, setSelectedMyShift] = useState<ShiftInfo | null>(
    null,
  );
  const [selectedColleagueId, setSelectedColleagueId] = useState<string | null>(
    null,
  );
  const [selectedTargetShift, setSelectedTargetShift] =
    useState<ColleagueShift | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const res = await Staff.getMySwapRequests();
      setRequests(res.data.data || []);
    } catch (err) {
      console.log("Swap requests load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const openForm = async () => {
    setFormOpen(true);
    setStep(1);
    try {
      const [shiftsRes, colleaguesRes] = await Promise.all([
        Staff.getMyShifts(),
        Staff.getColleagueShifts(),
      ]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = (shiftsRes.data.data || []).filter(
        (s: ShiftInfo) => new Date(s.date) >= today,
      );
      setMyShifts(upcoming);
      setColleagueShifts(colleaguesRes.data.data || []);
    } catch (err) {
      console.log("Swap form data load error:", err);
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setStep(1);
    setSelectedMyShift(null);
    setSelectedColleagueId(null);
    setSelectedTargetShift(null);
  };

  // ── Map my shifts by date-key for the calendar ──
  const myShiftsByDay = useMemo(() => {
    const map: Record<string, ShiftInfo> = {};
    myShifts.forEach((s) => {
      map[new Date(s.date).toDateString()] = s;
    });
    return map;
  }, [myShifts]);

  // ── Distinct colleagues who have upcoming shifts ──
  const colleagues = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; firstName: string; lastName: string }
    >();
    colleagueShifts.forEach((s) => {
      if (!seen.has(s.user.id)) seen.set(s.user.id, s.user);
    });
    return Array.from(seen.values());
  }, [colleagueShifts]);

  // ── Selected colleague's shifts, mapped by date-key for the second calendar ──
  const colleagueShiftsByDay = useMemo(() => {
    if (!selectedColleagueId) return {};
    const map: Record<string, ColleagueShift> = {};
    colleagueShifts
      .filter((s) => s.user.id === selectedColleagueId)
      .forEach((s) => {
        map[new Date(s.date).toDateString()] = s;
      });
    return map;
  }, [colleagueShifts, selectedColleagueId]);

  const handleSubmit = async () => {
    if (!selectedMyShift || !selectedTargetShift) {
      Alert.alert("Missing selection", "Pick both shifts before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await Staff.requestSwap({
        targetStaffId: selectedTargetShift.user.id,
        originalShiftId: selectedMyShift.id,
        targetShiftId: selectedTargetShift.id,
      });
      closeForm();
      loadRequests();
      Alert.alert("Sent", "Your swap request has been sent for review.");
    } catch (err: any) {
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
          <View className="flex-1 items-center">
            <Text className="text-white text-base font-semibold">
              Shift Swaps
            </Text>
          </View>
          <TouchableOpacity
            onPress={openForm}
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
          {requests.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-gray-100">
              <ArrowLeftRight size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No swap requests yet
              </Text>
            </View>
          ) : (
            requests.map((r) => {
              const style = STATUS_STYLES[r.status];
              return (
                <View
                  key={r.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-900 font-semibold">
                      {r.requester.firstName} {r.requester.lastName} ↔{" "}
                      {r.targetStaff.firstName} {r.targetStaff.lastName}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-full ${style.bg}`}>
                      <Text
                        className={`text-[10px] font-semibold ${style.text}`}
                      >
                        {style.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-500 text-xs">
                    Their shift: {new Date(r.originalShift.date).toDateString()}{" "}
                    · {r.originalShift.shiftType.name}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    Swap for: {new Date(r.targetShift.date).toDateString()} ·{" "}
                    {r.targetShift.shiftType.name}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── 3-step wizard: pick your date → pick colleague → pick their date ── */}
      <Modal
        visible={formOpen}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-8 max-h-[88%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-900 text-lg font-bold">
                {step === 1
                  ? "Pick Your Shift"
                  : step === 2
                    ? "Pick a Colleague"
                    : "Pick Their Shift"}
              </Text>
              <TouchableOpacity onPress={closeForm}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* step indicator */}
            <View className="flex-row items-center mb-5 gap-1.5">
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  className="flex-1 h-1 rounded-full"
                  style={{ backgroundColor: n <= step ? "#006B3C" : "#E5E7EB" }}
                />
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {step === 1 && (
                <>
                  {selectedMyShift && (
                    <View className="bg-emerald-50 rounded-xl px-4 py-3 mb-4">
                      <Text className="text-emerald-700 text-sm font-medium">
                        {new Date(selectedMyShift.date).toDateString()} ·{" "}
                        {selectedMyShift.shiftType.name}
                      </Text>
                    </View>
                  )}
                  {Object.keys(myShiftsByDay).length === 0 ? (
                    <Text className="text-gray-400 text-sm text-center py-8">
                      No upcoming shifts to swap
                    </Text>
                  ) : (
                    <MiniCalendar
                      shiftsByDay={myShiftsByDay}
                      selectedId={selectedMyShift?.id || null}
                      onSelect={(shiftId) => {
                        const shift =
                          myShifts.find((s) => s.id === shiftId) || null;
                        setSelectedMyShift(shift);
                      }}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => setStep(2)}
                    disabled={!selectedMyShift}
                    className={`rounded-xl py-4 items-center justify-center mt-5 ${
                      selectedMyShift ? "bg-[#006B3C]" : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`font-semibold text-base ${
                        selectedMyShift ? "text-white" : "text-gray-400"
                      }`}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  {colleagues.length === 0 ? (
                    <Text className="text-gray-400 text-sm text-center py-8">
                      No colleagues with upcoming shifts
                    </Text>
                  ) : (
                    <View className="flex-row flex-wrap gap-2">
                      {colleagues.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => {
                            setSelectedColleagueId(c.id);
                            setSelectedTargetShift(null);
                          }}
                          className={`px-4 py-2.5 rounded-xl ${
                            selectedColleagueId === c.id
                              ? "bg-[#006B3C]"
                              : "bg-gray-100"
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              selectedColleagueId === c.id
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {c.firstName} {c.lastName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View className="flex-row gap-3 mt-6">
                    <TouchableOpacity
                      onPress={() => setStep(1)}
                      className="flex-1 rounded-xl py-4 items-center justify-center bg-gray-100"
                    >
                      <Text className="text-gray-700 font-semibold text-base">
                        Back
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setStep(3)}
                      disabled={!selectedColleagueId}
                      className={`flex-1 rounded-xl py-4 items-center justify-center ${
                        selectedColleagueId ? "bg-[#006B3C]" : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-base ${
                          selectedColleagueId ? "text-white" : "text-gray-400"
                        }`}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  {selectedTargetShift && (
                    <View className="bg-emerald-50 rounded-xl px-4 py-3 mb-4">
                      <Text className="text-emerald-700 text-sm font-medium">
                        {new Date(selectedTargetShift.date).toDateString()} ·{" "}
                        {selectedTargetShift.shiftType.name}
                      </Text>
                    </View>
                  )}
                  {Object.keys(colleagueShiftsByDay).length === 0 ? (
                    <Text className="text-gray-400 text-sm text-center py-8">
                      No upcoming shifts for this colleague
                    </Text>
                  ) : (
                    <MiniCalendar
                      shiftsByDay={colleagueShiftsByDay}
                      selectedId={selectedTargetShift?.id || null}
                      onSelect={(shiftId) => {
                        const shift =
                          colleagueShifts.find((s) => s.id === shiftId) || null;
                        setSelectedTargetShift(shift);
                      }}
                      accentColor="#0891B2"
                    />
                  )}
                  <View className="flex-row gap-3 mt-6">
                    <TouchableOpacity
                      onPress={() => setStep(2)}
                      className="flex-1 rounded-xl py-4 items-center justify-center bg-gray-100"
                    >
                      <Text className="text-gray-700 font-semibold text-base">
                        Back
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={!selectedTargetShift || submitting}
                      className={`flex-1 rounded-xl py-4 items-center justify-center ${
                        selectedTargetShift ? "bg-[#006B3C]" : "bg-gray-200"
                      }`}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text
                          className={`font-semibold text-base ${
                            selectedTargetShift ? "text-white" : "text-gray-400"
                          }`}
                        >
                          Send Request
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
