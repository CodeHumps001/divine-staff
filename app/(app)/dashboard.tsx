// app/(app)/dashboard.tsx
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  Megaphone,
  MessageSquare,
  Settings,
  Settings2,
  TimerReset,
  User as UserIcon,
  Users,
  UsersIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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

type Department = { id: string; name: string };
type DeptAttendanceRecord = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT";
  user: { firstName: string; lastName: string };
  shift: { date: string; shiftType: { name: string } };
};

type AttendanceRecord = {
  id: string;
  clockOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT";
  shift: { date: string };
};
type Shift = {
  id: string;
  date: string;
  shiftType: { name: string; startTime: string; endTime: string };
};
type LeaveApplication = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};
type Announcement = { id: string; title: string; createdAt: string };

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─── Premium Insight Card ───────────────────────────────────────
function InsightCard({
  title,
  value,
  subtitle,
  accent,
  bars,
  trend,
}: {
  title: string;
  value: string | number | null;
  subtitle: string;
  accent: [string, string];
  bars: number[];
  trend: string;
}) {
  return (
    <View
      className="w-[220px] rounded-[20px] overflow-hidden border border-white/20"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-3 py-3"
      >
        <View className="flex-row items-start justify-between p-3">
          <View className="flex-1 pr-3">
            <Text className="text-white text-[10px] font-semibold  ">
              {title}
            </Text>
            <Text className="text-white text-[35px] font-bold mt-1">
              {value !== null && value !== undefined ? value : "—"}
            </Text>
            <Text className="text-white/70 text-[12px] mt-1">{subtitle}</Text>
          </View>
          <View className="px-2 py-0.5 rounded-full bg-white/15">
            <Text className="text-white text-[10px] font-semibold">
              {trend}
            </Text>
          </View>
        </View>

        <View className="flex-row items-end h-12 mt-3 gap-1">
          {bars.map((bar, index) => (
            <View
              key={index}
              className="flex-1 rounded-t-[10px] overflow-hidden bg-white/20 justify-end"
            >
              <View
                className="bg-white/90 rounded-t-[10px]"
                style={{ height: `${bar}%` }}
              />
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Quick Action (now supports a locked/disabled state) ───────
function QuickAction({
  icon,
  label,
  onPress,
  accentColor,
  accentBg,
  locked,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  accentColor: string;
  accentBg: string;
  locked?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={
        locked
          ? () =>
              Alert.alert(
                "Not available",
                "This feature is only available to Department Heads.",
              )
          : onPress
      }
      activeOpacity={0.7}
      className="w-[47%] bg-white rounded-[12px] px-3.5 py-3.5 border border-gray-100 flex-row items-center gap-3"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        opacity: locked ? 0.55 : 1,
      }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: locked ? "#F1F5F9" : accentBg }}
      >
        {locked ? <Lock size={16} color="#94A3B8" /> : icon}
      </View>
      <Text
        className="text-[13px] font-medium"
        style={{ color: locked ? "#94A3B8" : accentColor }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SquareQuickAction({
  icon,
  label,
  onPress,
  accentColor,
  accentBg,
  badgeCount,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  accentColor: string;
  accentBg: string;
  badgeCount?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-[18px] items-center justify-center gap-2 border border-gray-100 px-3"
      style={{
        width: 108,
        height: 108,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="relative">
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: accentBg }}
        >
          {icon}
        </View>
        {!!badgeCount && badgeCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
            <Text className="text-white text-[10px] font-bold">
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        className="text-[11px] font-medium text-center leading-4"
        style={{ color: accentColor }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isDeptHead = user?.role === "DEPT_HEAD";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);

  const [clockedIn, setClockedIn] = useState(false);
  const [attendanceRate, setAttendanceRate] = useState<string | null>(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number | null>(
    null,
  );
  const [upcomingShift, setUpcomingShift] = useState<Shift | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<Announcement | null>(null);
  const [unreadDot, setUnreadDot] = useState(false);
  const [todaysShiftCount, setTodaysShiftCount] = useState(0);
  const [approvalRate, setApprovalRate] = useState<string | null>(null);
  const lastAnnouncementId = useRef<string | null>(null);
  const lastShiftId = useRef<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptAttendance, setDeptAttendance] = useState<DeptAttendanceRecord[]>(
    [],
  );
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    Staff.getDepartments()
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.log("Departments load error:", err));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !selectedDeptId) return;
    setLoadingAttendance(true);
    Staff.getDepartmentAttendance(selectedDeptId)
      .then((res) => {
        const records: DeptAttendanceRecord[] = res.data.data || [];
        records.sort(
          (a, b) =>
            new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
        );
        setDeptAttendance(records.slice(0, 6));
      })
      .catch((err) => console.log("Dept attendance load error:", err))
      .finally(() => setLoadingAttendance(false));
  }, [isSuperAdmin, selectedDeptId]);

  const scheduleReminder = useCallback(async (title: string, body: string) => {
    const settings = await Notifications.requestPermissionsAsync();
    if (settings.status !== "granted") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: "/(app)/dashboard" },
      },
      trigger: null,
    });
  }, []);

  // ── Full dashboard load — used on mount, pull-to-refresh, and manual refresh ──
  // This is the ONLY place that derives `clockedIn` from the attendance list.
  const loadDashboard = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        const announcementsRes = await Staff.getAnnouncements().catch(
          () => null,
        );
        if (announcementsRes) {
          const list: Announcement[] = announcementsRes.data.data || [];
          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setLatestAnnouncement(list[0] || null);
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [attendanceRes, leaveRes, shiftsRes, announcementsRes] =
        await Promise.allSettled([
          Staff.getMyAttendance(),
          Staff.getMyLeave(),
          Staff.getMyShifts(),
          Staff.getAnnouncements(),
        ]);

      const records: AttendanceRecord[] =
        attendanceRes.status === "fulfilled"
          ? attendanceRes.value.data.data || []
          : [];
      const shifts: Shift[] =
        shiftsRes.status === "fulfilled" ? shiftsRes.value.data.data || [] : [];

      const today = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayRecord = records.find((r) =>
        isSameDay(new Date(r.shift.date), today),
      );
      setClockedIn(!!todayRecord && !todayRecord.clockOut);

      const todayShifts = shifts.filter((s) =>
        isSameDay(new Date(s.date), today),
      );
      setTodaysShiftCount(todayShifts.length);

      const pastShifts = shifts.filter((s) => new Date(s.date) < startOfToday);
      if (pastShifts.length > 0) {
        const covered = pastShifts.filter((s) =>
          records.some(
            (r) =>
              isSameDay(new Date(r.shift.date), new Date(s.date)) &&
              r.status !== "ABSENT",
          ),
        ).length;
        setAttendanceRate(
          `${Math.round((covered / pastShifts.length) * 100)}%`,
        );
      } else {
        setAttendanceRate("—");
      }

      if (leaveRes.status === "fulfilled") {
        const leaves: LeaveApplication[] = leaveRes.value.data.data || [];
        const total = leaves.length;
        const approved = leaves.filter((l) => l.status === "APPROVED").length;
        setApprovalRate(
          total > 0 ? `${Math.round((approved / total) * 100)}%` : "—",
        );
        setPendingLeaveCount(
          leaves.filter((l) => l.status === "PENDING").length,
        );
      }

      const upcoming = shifts
        .filter((s) => new Date(s.date) >= startOfToday)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      const nextShift = upcoming[0] || null;
      setUpcomingShift(nextShift);

      if (nextShift && lastShiftId.current !== nextShift.id) {
        const shiftDate = new Date(nextShift.date);
        const isSoon = shiftDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
        if (isSoon) {
          lastShiftId.current = nextShift.id;
          void scheduleReminder(
            "Shift reminder",
            `${nextShift.shiftType.name} starts at ${nextShift.shiftType.startTime}`,
          );
        }
      }

      if (announcementsRes.status === "fulfilled") {
        const list: Announcement[] = announcementsRes.value.data.data || [];
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const latest = list[0] || null;
        setLatestAnnouncement(latest);
        if (latest) {
          const hrsAgo =
            (Date.now() - new Date(latest.createdAt).getTime()) / 36e5;
          setUnreadDot(hrsAgo < 24);
          if (lastAnnouncementId.current !== latest.id) {
            lastAnnouncementId.current = latest.id;
            const notificationBody =
              latest.title.length > 80
                ? `${latest.title.slice(0, 77)}...`
                : latest.title;
            void scheduleReminder("New announcement", notificationBody);
          }
        }
      }
    } catch (err) {
      console.log("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scheduleReminder, isSuperAdmin]);

  // ── Lighter refresh used right after a clock action ──
  // Updates only attendanceRate / todaysShiftCount — deliberately does NOT
  // touch `clockedIn`, since that was already set directly from the
  // clockIn/clockOut API response itself (the actual source of truth).
  const refreshStatsOnly = useCallback(async () => {
    if (isSuperAdmin) return;
    try {
      const [attendanceRes, shiftsRes] = await Promise.allSettled([
        Staff.getMyAttendance(),
        Staff.getMyShifts(),
      ]);

      const records: AttendanceRecord[] =
        attendanceRes.status === "fulfilled"
          ? attendanceRes.value.data.data || []
          : [];
      const shifts: Shift[] =
        shiftsRes.status === "fulfilled" ? shiftsRes.value.data.data || [] : [];

      const today = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayShifts = shifts.filter((s) =>
        isSameDay(new Date(s.date), today),
      );
      setTodaysShiftCount(todayShifts.length);

      const pastShifts = shifts.filter((s) => new Date(s.date) < startOfToday);
      if (pastShifts.length > 0) {
        const covered = pastShifts.filter((s) =>
          records.some(
            (r) =>
              isSameDay(new Date(r.shift.date), new Date(s.date)) &&
              r.status !== "ABSENT",
          ),
        ).length;
        setAttendanceRate(
          `${Math.round((covered / pastShifts.length) * 100)}%`,
        );
      }
    } catch (err) {
      console.log("Stats refresh error:", err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // ── Clock in/out — now trusts the mutation response directly ──
  const handleClockToggle = async () => {
    setClockingIn(true);
    try {
      if (clockedIn) {
        const res = await Staff.clockOut();
        // clockOut succeeded → we are now definitely clocked out
        setClockedIn(false);
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location required",
            "We need your location to clock in.",
          );
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const res = await Staff.clockIn(
          loc.coords.latitude,
          loc.coords.longitude,
        );
        // clockIn succeeded → we are now definitely clocked in,
        // regardless of what a stale list-reload might say
        setClockedIn(true);
      }
      // refresh secondary stats only — clockedIn is already correct above
      refreshStatsOnly();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setClockingIn(false);
    }
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  })();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006B3C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7F6]" edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ─── PREMIUM HEADER ─────────────────────────────────── */}
        <View className="mx-4 mt-14 overflow-hidden rounded-[28px] ">
          <LinearGradient
            colors={["#0F5132", "#146C43", "#1F8B5B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 py-5"
          >
            <View className="absolute -right-2 -top-8 w-24 h-24 rounded-full bg-white/10" />
            <View className="absolute -left-3 bottom-0 w-20 h-20 rounded-full bg-white/10" />

            <View className="flex-row items-start justify-between relative z-10 p-5">
              <View className="flex-1 pr-4">
                <Text className="text-white text-sm font-semibold mt-3">
                  {greeting},
                </Text>
                <Text className="text-white text-[42px] font-semibold mt-0.5">
                  {user?.firstName || user?.name || "Staff"}
                </Text>
                <Text className="text-emerald-50 text-sm mt-2">
                  Everything you need for today in one polished place.
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => router.push("/(app)/announcements")}
                  className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Bell size={18} color="#fff" />
                  {unreadDot && (
                    <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/(app)/profile")}
                  className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <UserIcon size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
        {/* ─── CLOCK IN CARD — hidden for SUPER_ADMIN (no personal shifts) ── */}
        {!isSuperAdmin && (
          <View className="mx-4 mt-4">
            <View
              className="bg-white rounded-[24px] px-5 py-4 border border-gray-100"
              style={{
                shadowColor: "#0F172A",
                shadowOpacity: 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Today's Status
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className={`w-2 h-2 rounded-full mr-2 ${
                        clockedIn ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    <Text className="text-gray-700 text-sm font-medium">
                      {clockedIn ? "Clocked In" : "Not Clocked In"}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">
                    {clockedIn
                      ? "You are currently on duty."
                      : "Tap to clock in when ready."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClockToggle}
                  disabled={clockingIn}
                  activeOpacity={0.8}
                  className={`px-3 py-3 rounded-2xl flex-row items-center ${
                    clockedIn ? "bg-red-50" : "bg-emerald-600"
                  } ${clockingIn ? "opacity-60" : ""}`}
                >
                  {clockingIn ? (
                    <ActivityIndicator
                      size="small"
                      color={clockedIn ? "#DC2626" : "#fff"}
                    />
                  ) : (
                    <>
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center mr-2 ${
                          clockedIn ? "bg-white/70" : "bg-white/15"
                        }`}
                      >
                        {clockedIn ? (
                          <TimerReset size={16} color="#DC2626" />
                        ) : (
                          <Clock3 size={16} color="#fff" />
                        )}
                      </View>
                      <Text
                        className={`font-semibold text-sm ${
                          clockedIn ? "text-red-600" : "text-white"
                        }`}
                      >
                        {clockedIn ? "Clock Out" : "Clock In"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ─── ADMIN QUICK ACTIONS — SUPER_ADMIN only, swipeable square cards ── */}
        {isSuperAdmin && (
          <View className="mx-4 mt-5">
            <Text className="text-gray-700 text-[13px] font-semibold mb-2.5">
              Admin Actions
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 10 }}
            >
              <View className="flex-row gap-3">
                <SquareQuickAction
                  icon={<Megaphone size={20} color="#059669" />}
                  label="Post Announcement"
                  onPress={() => router.push("/(app)/announcements")}
                  accentColor="#059669"
                  accentBg="#D1FAE5"
                />
                <SquareQuickAction
                  icon={<Settings2 size={20} color="#DB2777" />}
                  label="Generate Schedule"
                  onPress={() => router.push("/(app)/shifts/generate")}
                  accentColor="#DB2777"
                  accentBg="#FCE7F3"
                />
                <SquareQuickAction
                  icon={<Users size={20} color="#0891B2" />}
                  label="Review Leave"
                  onPress={() => router.push("/(app)/leave/department")}
                  accentColor="#0891B2"
                  accentBg="#CFFAFE"
                />
                <SquareQuickAction
                  icon={<Settings size={20} color="#7C3AED" />}
                  label="Hospital Settings"
                  onPress={() => router.push("/(app)/settings/hospital")}
                  accentColor="#7C3AED"
                  accentBg="#EDE9FE"
                />
                <SquareQuickAction
                  icon={<UsersIcon size={20} color="#0F766E" />}
                  label="Manage Staff"
                  onPress={() => router.push("/(app)/settings/staff")}
                  accentColor="#0F766E"
                  accentBg="#CCFBF1"
                />
                <SquareQuickAction
                  icon={<MessageSquare size={20} color="#DC2626" />}
                  label="View Feedback"
                  onPress={() => router.push("/(app)/settings/feedback")}
                  accentColor="#DC2626"
                  accentBg="#FEE2E2"
                />
              </View>
            </ScrollView>
          </View>
        )}
        {/* ─── ATTENDANCE LOGS — SUPER_ADMIN only ────────────────── */}
        {isSuperAdmin && (
          <View className="mx-4 mt-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-gray-700 text-[13px] font-semibold">
                Attendance Logs
              </Text>
            </View>

            <View
              className="bg-white rounded-[24px] p-4 border border-gray-100"
              style={{
                shadowColor: "#0F172A",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View className="flex-row items-center mb-3">
                <Building2 size={15} color="#006B3C" />
                <Text className="text-gray-900 font-semibold ml-2 text-sm">
                  Department
                </Text>
              </View>
              {departments.length === 0 ? (
                <Text className="text-gray-400 text-sm">
                  Loading departments...
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setSelectedDeptId(d.id)}
                      className={`px-3.5 py-1.5 rounded-xl mr-2 ${
                        selectedDeptId === d.id ? "bg-[#006B3C]" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selectedDeptId === d.id
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {!selectedDeptId ? (
                <Text className="text-gray-400 text-sm text-center py-4">
                  Select a department to view logs
                </Text>
              ) : loadingAttendance ? (
                <ActivityIndicator
                  size="small"
                  color="#006B3C"
                  className="my-4"
                />
              ) : deptAttendance.length === 0 ? (
                <Text className="text-gray-400 text-sm text-center py-4">
                  No recent attendance records
                </Text>
              ) : (
                deptAttendance.map((r) => (
                  <View
                    key={r.id}
                    className="flex-row items-center justify-between py-2.5 border-b border-gray-50"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-gray-900 text-sm font-medium">
                        {r.user.firstName} {r.user.lastName}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {new Date(r.shift.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {r.shift.shiftType.name}
                      </Text>
                    </View>
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        r.status === "PRESENT"
                          ? "bg-green-50"
                          : r.status === "LATE"
                            ? "bg-amber-50"
                            : "bg-red-50"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-semibold ${
                          r.status === "PRESENT"
                            ? "text-green-600"
                            : r.status === "LATE"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {r.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
        {/* ─── INSIGHTS CAROUSEL — hidden for SUPER_ADMIN ────────── */}
        {!isSuperAdmin && (
          <View className="mx-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-700 text-[13px] font-semibold">
                Performance Snapshot
              </Text>
              <Text className="text-emerald-600 text-[10px] font-semibold">
                Swipe for more
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingVertical: 2,
                paddingRight: 10,
                paddingLeft: 0,
              }}
            >
              <View className="flex-row gap-3">
                <InsightCard
                  title="Attendance Pulse"
                  value={attendanceRate ?? "—"}
                  subtitle="Coverage across your recent shifts"
                  accent={["#0F766E", "#34D399"]}
                  bars={[45, 68, 74, 82, 90]}
                  trend="+8%"
                />
                <InsightCard
                  title="Leave Approval"
                  value={approvalRate ?? "—"}
                  subtitle="How your requests are performing"
                  accent={["#7C3AED", "#A78BFA"]}
                  bars={[30, 45, 62, 78, 90]}
                  trend="Stable"
                />
                <InsightCard
                  title="Shift Load"
                  value={todaysShiftCount}
                  subtitle="Shifts on your schedule today"
                  accent={["#D97706", "#FBBF24"]}
                  bars={[50, 65, 58, 74, 82]}
                  trend="On track"
                />
              </View>
            </ScrollView>
          </View>
        )}
        {/* ─── QUICK ACTIONS — hidden entirely for SUPER_ADMIN ───── */}
        {!isSuperAdmin && (
          <View className="mx-4 mt-5">
            <Text className="text-gray-700 text-[13px] font-semibold mb-2.5">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap justify-between gap-3">
              <QuickAction
                icon={<CalendarCheck size={18} color="#2563EB" />}
                label="Attendance"
                onPress={() => router.push("/(app)/attendance")}
                accentColor="#2563EB"
                accentBg="#DBEAFE"
              />
              <QuickAction
                icon={<FileText size={18} color="#7C3AED" />}
                label="Request Leave"
                onPress={() => router.push("/(app)/leave")}
                accentColor="#7C3AED"
                accentBg="#EDE9FE"
              />
              <QuickAction
                icon={<Calendar size={18} color="#D97706" />}
                label="My Shifts"
                onPress={() => router.push("/(app)/shifts")}
                accentColor="#D97706"
                accentBg="#FEF3C7"
              />
              <QuickAction
                icon={<Bell size={18} color="#059669" />}
                label="Announcements"
                onPress={() => router.push("/(app)/announcements")}
                accentColor="#059669"
                accentBg="#D1FAE5"
              />

              <QuickAction
                icon={<Settings2 size={18} color="#DB2777" />}
                label="Generate Schedule"
                onPress={() => router.push("/(app)/shifts/generate")}
                accentColor="#DB2777"
                accentBg="#FCE7F3"
                locked={!isDeptHead}
              />
              <QuickAction
                icon={<Users size={18} color="#0891B2" />}
                label="Review Leave"
                onPress={() => router.push("/(app)/leave/department")}
                accentColor="#0891B2"
                accentBg="#CFFAFE"
                locked={!isDeptHead}
              />
              {user?.position === "DOCTOR" && (
                <QuickAction
                  icon={<Calendar size={18} color="#DB2777" />}
                  label="My Appointments"
                  onPress={() => router.push("/(app)/appointments")}
                  accentColor="#DB2777"
                  accentBg="#FCE7F3"
                />
              )}
            </View>
          </View>
        )}
        {/* ─── UPCOMING SHIFT — hidden for SUPER_ADMIN ───────────── */}
        {!isSuperAdmin && (
          <View className="mx-4 mt-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-gray-700 text-[13px] font-semibold">
                Upcoming Shift
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/shifts")}
                activeOpacity={0.7}
              >
                <Text className="text-emerald-600 text-xs font-semibold">
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View
              className="bg-white rounded-[24px] px-5 py-4 border border-gray-100"
              style={{
                shadowColor: "#0F172A",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              {upcomingShift ? (
                <View>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-gray-700 text-sm font-semibold">
                        {new Date(upcomingShift.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </Text>
                      <Text className="text-gray-500 text-sm font-normal mt-0.5">
                        {upcomingShift.shiftType.name}
                      </Text>
                    </View>
                    <View className="bg-emerald-50 px-3 py-1.5 rounded-full">
                      <Text className="text-emerald-700 text-xs font-semibold">
                        {upcomingShift.shiftType.startTime}–
                        {upcomingShift.shiftType.endTime}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-3 pt-3 border-t border-gray-50">
                    <Clock3 size={14} color="#94A3B8" />
                    <Text className="text-gray-400 text-xs ml-1.5">
                      {(() => {
                        const shiftDate = new Date(upcomingShift.date);
                        const now = new Date();
                        const diff = shiftDate.getTime() - now.getTime();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        if (hours < 0) return "Shift started";
                        if (hours < 1) return "Starting soon";
                        if (hours < 24) return `In ${hours}h`;
                        return `${Math.floor(hours / 24)}d away`;
                      })()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="py-2">
                  <Text className="text-gray-400 text-sm font-normal">
                    No upcoming shifts
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        {/* ─── LATEST ANNOUNCEMENT — visible to everyone, incl. SUPER_ADMIN ── */}
        {latestAnnouncement && (
          <TouchableOpacity
            onPress={() => router.push("/(app)/announcements")}
            activeOpacity={0.7}
            className="mx-4 mt-4 bg-white rounded-[24px] px-5 py-4 border border-gray-100 flex-row items-center"
            style={{
              shadowColor: "#0F172A",
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mr-3">
              <Bell size={16} color="#64748B" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-gray-700 text-sm font-medium"
                  numberOfLines={1}
                >
                  {latestAnnouncement.title}
                </Text>
                {unreadDot && (
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </View>
              <Text className="text-gray-400 text-xs mt-0.5">
                {new Date(latestAnnouncement.createdAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
