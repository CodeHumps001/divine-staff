import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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
import { Auth } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

// Placeholder — swap for your own hosted image or a local require() when ready
const BG_IMAGE =
  "https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=1200&auto=format&fit=crop";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await Auth.login(email, password);
      const { token, user } = res.data.data;
      await login(user, token);
      router.replace("/(app)/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── TOP — background image with overlay ── */}
          <ImageBackground
            source={{ uri: BG_IMAGE }}
            resizeMode="cover"
            className="h-72 items-center justify-center px-6"
          >
            {/* dark overlay so white text is readable */}
            <View className="absolute inset-0 bg-black/50" />

            <Text className="text-white text-3xl font-bold tracking-wide text-center">
              Divine Netcare
            </Text>
            <Text className="text-white/80 text-sm mt-1">Staff Portal</Text>
          </ImageBackground>

          {/* ── BOTTOM — white card, extends to real bottom of screen ── */}
          <View
            className="flex-1 bg-white rounded-t-3xl px-6 pt-8 -mt-6"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <Text className="text-[#006B3C] text-2xl font-bold mb-1">
              Welcome Back
            </Text>
            <Text className="text-gray-400 text-sm mb-6">
              Sign in to your account
            </Text>

            {/* Error */}
            {error !== "" && (
              <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            {/* Email */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Email Address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
              />
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 py-3.5 text-gray-900 text-sm"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="pl-2 py-2"
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#9CA3AF" />
                  ) : (
                    <Eye size={18} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              className={`w-full rounded-xl py-4 items-center justify-center ${
                loading ? "bg-green-300" : "bg-[#006B3C]"
              }`}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-semibold text-base ml-2">
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs text-center mt-5">
              For account issues contact your administrator
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
