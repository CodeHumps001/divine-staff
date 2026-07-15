// app/(app)/shifts/generate.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Building2, Check, ShieldAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type DeptUser = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
};

type Department = {
  id: string;
  name: string;
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

export default function GenerateShiftScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const canManageShifts =
    user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";
  const isSuperAdminRole = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!canManageShifts) {
      router.replace("/(app)/shifts");
    }
  }, [canManageShifts]);

  const [staffList, setStaffList] = useState<DeptUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(
    user?.departmentId || null,
  );

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [morning, setMorning] = useState<string[]>([]);
  const [night, setNight] = useState<string[]>([]);
  const [rotating, setRotating] = useState<string[]>([]);

  // ── Load department list, SUPER_ADMIN only ──
  useEffect(() => {
    if (!isSuperAdminRole) return;
    Staff.getDepartments()
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.log("Departments load error:", err));
  }, [isSuperAdminRole]);

  // ── Load staff for whichever department is currently selected ──
  useEffect(() => {
    if (!canManageShifts || !selectedDeptId) {
      setLoadingStaff(false);
      return;
    }

    const loadDeptStaff = async () => {
      setLoadingStaff(true);
      try {
        const res = await Staff.getDepartment(selectedDeptId);
        setStaffList(res.data.data.users || []);
      } catch (err) {
        console.log("Dept staff load error:", err);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadDeptStaff();
  }, [selectedDeptId, canManageShifts]);

  const toggleStaff = (
    id: string,
    group: string[],
    setGroup: (v: string[]) => void,
  ) => {
    setGroup(
      group.includes(id) ? group.filter((x) => x !== id) : [...group, id],
    );
  };

  const handleGenerate = async () => {
    if (!selectedDeptId) {
      Alert.alert(
        "Pick a department",
        "Select which department this schedule is for.",
      );
      return;
    }
    if (morning.length === 0 && night.length === 0 && rotating.length === 0) {
      Alert.alert(
        "No staff assigned",
        "Assign at least one staff member to a group.",
      );
      return;
    }
    setGenerating(true);
    try {
      await Staff.generateShifts({
        departmentId: selectedDeptId,
        month,
        year,
        mode: "auto",
        staffGroups: { morning, night, rotating },
      });
      Alert.alert("Success", "Shift schedule generated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Couldn't generate",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setGenerating(false);
    }
  };

  // ── Role guard: covers the brief moment before the redirect fires ──
  if (!canManageShifts) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <ShieldAlert size={32} color="#D1D5DB" />
        <Text className="text-gray-400 text-sm mt-3 text-center">
          You don't have permission to view this page
        </Text>
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
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">
            Generate Schedule
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Department picker, SUPER_ADMIN only ── */}
        {isSuperAdminRole && (
          <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Building2 size={16} color="#006B3C" />
              <Text className="text-gray-900 font-semibold ml-2">
                Department
              </Text>
            </View>
            {departments.length === 0 ? (
              <Text className="text-gray-400 text-sm">
                Loading departments...
              </Text>
            ) : (
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
            )}
          </View>
        )}

        {/* Month */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-semibold mb-3">Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MONTH_NAMES.map((m, i) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMonth(i + 1)}
                className={`px-4 py-2 rounded-xl mr-2 ${
                  month === i + 1 ? "bg-[#006B3C]" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    month === i + 1 ? "text-white" : "text-gray-600"
                  }`}
                >
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── No department selected yet (SUPER_ADMIN) ── */}
        {isSuperAdminRole && !selectedDeptId ? (
          <View className="mx-6 mt-6 items-center py-12 bg-white rounded-2xl border border-gray-100">
            <Building2 size={28} color="#D1D5DB" />
            <Text className="text-gray-400 text-sm mt-3 text-center px-6">
              Select a department above to load its staff
            </Text>
          </View>
        ) : loadingStaff ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#006B3C" />
          </View>
        ) : (
          <>
            {/* Staff groups */}
            <StaffGroupPicker
              title="Morning Shift"
              staffList={staffList}
              selected={morning}
              onToggle={(id) => toggleStaff(id, morning, setMorning)}
            />
            <StaffGroupPicker
              title="Night Shift"
              staffList={staffList}
              selected={night}
              onToggle={(id) => toggleStaff(id, night, setNight)}
            />
            <StaffGroupPicker
              title="Rotating"
              staffList={staffList}
              selected={rotating}
              onToggle={(id) => toggleStaff(id, rotating, setRotating)}
            />

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              className={`mx-6 mt-6 rounded-xl py-4 items-center justify-center ${
                generating ? "bg-green-300" : "bg-[#006B3C]"
              }`}
            >
              {generating ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Generate Schedule
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StaffGroupPicker({
  title,
  staffList,
  selected,
  onToggle,
}: {
  title: string;
  staffList: DeptUser[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100">
      <Text className="text-gray-900 font-semibold mb-3">{title}</Text>
      {staffList.length === 0 ? (
        <Text className="text-gray-400 text-sm">
          No staff in this department
        </Text>
      ) : (
        staffList.map((s) => {
          const isSelected = selected.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => onToggle(s.id)}
              className="flex-row items-center justify-between py-2.5 border-b border-gray-50"
            >
              <View>
                <Text className="text-gray-900 text-sm font-medium">
                  {s.firstName} {s.lastName}
                </Text>
                <Text className="text-gray-400 text-xs">{s.position}</Text>
              </View>
              <View
                className={`w-6 h-6 rounded-md items-center justify-center border ${
                  isSelected
                    ? "bg-[#006B3C] border-[#006B3C]"
                    : "border-gray-300"
                }`}
              >
                {isSelected && <Check size={14} color="#ffffff" />}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
