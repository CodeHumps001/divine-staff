// app/(app)/shifts/generate.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, ShieldAlert } from "lucide-react-native";
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

  const canManageShifts =
    user?.role === "DEPT_HEAD" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!canManageShifts) {
      router.replace("/(app)/shifts");
    }
  }, [canManageShifts]);

  const [staffList, setStaffList] = useState<DeptUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [morning, setMorning] = useState<string[]>([]);
  const [night, setNight] = useState<string[]>([]);
  const [rotating, setRotating] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!canManageShifts) return;

    const loadDeptStaff = async () => {
      try {
        const res = await Staff.getDepartment(user?.departmentId);
        setStaffList(res.data.data.users || []);
      } catch (err) {
        console.log("Dept staff load error:", err);
      } finally {
        setLoadingStaff(false);
      }
    };
    if (user?.departmentId) loadDeptStaff();
  }, [user?.departmentId, canManageShifts]);

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
        departmentId: user?.departmentId,
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

  if (loadingStaff) {
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
        <View className=" px-6 pt-4 pb-8 rounded-b-3xl flex-row items-center">
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
        {/* Month */}
        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-semibold mb-3">Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MONTH_NAMES.map((m, i) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMonth(i + 1)}
                className={`px-4 py-2 rounded-xl mr-2 ${month === i + 1 ? "bg-[#006B3C]" : "bg-gray-100"}`}
              >
                <Text
                  className={`text-sm font-medium ${month === i + 1 ? "text-white" : "text-gray-600"}`}
                >
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
      {staffList.map((s) => {
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
                isSelected ? "bg-[#006B3C] border-[#006B3C]" : "border-gray-300"
              }`}
            >
              {isSelected && <Check size={14} color="#ffffff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
