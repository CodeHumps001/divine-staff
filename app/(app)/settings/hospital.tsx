// app/(app)/settings/hospital.tsx
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, ShieldAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Staff } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

export default function HospitalSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/(app)/dashboard");
  }, [isSuperAdmin]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState("100");

  useEffect(() => {
    if (!isSuperAdmin) return;
    Staff.getHospitalSettings()
      .then((res) => {
        const data = res.data.data;
        if (data) {
          setName(data.name || "");
          setAddress(data.address || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setLogoUrl(data.logoUrl || "");
          setLatitude(data.latitude?.toString() || "");
          setLongitude(data.longitude?.toString() || "");
          setGeofenceRadius(data.geofenceRadius?.toString() || "100");
        }
      })
      .catch((err) => {
        // 404 means settings haven't been configured yet — that's fine,
        // just start with an empty first-time setup form
        if (err.response?.status === 404) {
          setIsFirstSetup(true);
        } else {
          console.log("Settings load error:", err);
        }
      })
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "We need your location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch (err) {
      Alert.alert("Error", "Couldn't get current location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing info", "Hospital name is required.");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseFloat(geofenceRadius);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert(
        "Invalid input",
        "Latitude and longitude must be valid numbers.",
      );
      return;
    }

    setSaving(true);
    try {
      await Staff.updateHospitalSettings({
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        geofenceRadius: isNaN(radius) ? 100 : radius,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      setIsFirstSetup(false);
      Alert.alert("Saved", "Hospital settings updated successfully.");
    } catch (err: any) {
      Alert.alert(
        "Couldn't save",
        err.response?.data?.message || "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
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
              Hospital Settings
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 42 }}
      >
        {isFirstSetup && (
          <View className="mx-6 mt-6  bg-amber-50 border border-amber-100 rounded-2xl px-4 py-6">
            <Text className="text-amber-700 text-sm">
              Hospital settings haven't been configured yet. Fill in the details
              below to set them up.
            </Text>
          </View>
        )}

        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-semibold mb-3">
            Hospital Info
          </Text>

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Divine Netcare Hospital"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
          />

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Address
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city, region"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
          />

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Phone
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="0244123456"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
          />

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="info@divinenetcare.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm mb-4"
          />

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Logo URL
          </Text>
          <TextInput
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder="https://..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
          />
        </View>

        <View className="mx-6 mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 font-semibold">
              Clock-In Geofence
            </Text>
            <TouchableOpacity
              onPress={useCurrentLocation}
              disabled={locating}
              className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-full"
            >
              {locating ? (
                <ActivityIndicator size="small" color="#006B3C" />
              ) : (
                <>
                  <MapPin size={13} color="#006B3C" />
                  <Text className="text-[#006B3C] text-xs font-semibold ml-1">
                    Use My Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Latitude <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={latitude}
                onChangeText={setLatitude}
                placeholder="5.6037"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Longitude <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={longitude}
                onChangeText={setLongitude}
                placeholder="-0.1870"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
              />
            </View>
          </View>

          <Text className="text-gray-700 text-sm font-medium mb-1.5">
            Geofence Radius (meters)
          </Text>
          <TextInput
            value={geofenceRadius}
            onChangeText={setGeofenceRadius}
            placeholder="100"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
          />
          <Text className="text-gray-400 text-xs mt-2">
            Staff must be within this distance of the coordinates above to clock
            in. Defaults to 100m if left blank.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`mx-6 mt-6 rounded-xl py-4 items-center justify-center ${
            saving ? "bg-green-300" : "bg-[#006B3C]"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Save Settings
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
