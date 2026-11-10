import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, Auth } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

const CAROUSEL_SLIDES = [
  {
    title: "Divine Netcare",
    message:
      "Welcome to your app! Sign in below to view your hospital workspace, tasks, and team updates.",
    image: require("../../assets/images/care.png"),
  },
  {
    title: "Stay Connected",
    message:
      "Chat with clinical staff instantly and get active hospital operational announcements in real-time.",
    image: require("../../assets/images/commu.png"),
  },
  {
    title: "Manage Shifts",
    message:
      "Easily view your upcoming medical schedules, request time off, or swap shifts effortlessly.",
    image: require("../../assets/images/shift.png"),
  },
];

const TOP_SECTION_HEIGHT = 440;
const TOP_SECTION_COLLAPSED_HEIGHT = 120;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  let insets = { bottom: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    // Keeps layout coordinates stable if system context loads slowly
  }

  const [activeSlide, setActiveSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Drives the collapse animation of the top image section
  const topSectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(topSectionAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // height isn't supported by the native driver
    }).start();
  }, [isFocused]);

  const animatedTopHeight = topSectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [TOP_SECTION_HEIGHT, TOP_SECTION_COLLAPSED_HEIGHT],
  });

  const animatedContentOpacity = topSectionAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prevSlide) => (prevSlide + 1) % CAROUSEL_SLIDES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both fields");
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      const res = await Auth.login(email.trim(), password);
      const { token, user } = res.data.data;
      await login(user, token);
      router.replace("/(app)/dashboard");
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const responseMessage = err.response?.data?.message;

        if (typeof responseMessage === "string" && responseMessage.length > 0) {
          setError(responseMessage);
        } else if (!err.response) {
          setError(
            `Can't reach the server at ${API_URL}. Check that the backend is running and this device can access that address.`,
          );
        } else {
          setError(`Sign-in failed (HTTP ${err.response.status}).`);
        }
      } else {
        setError("Something went wrong while signing in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── TOP SECTION: animates shorter when an input is focused ── */}
          <Animated.View style={{ height: animatedTopHeight }}>
            <ImageBackground
              source={CAROUSEL_SLIDES[activeSlide].image}
              className="flex-1 justify-end"
              resizeMode="cover"
            >
              {/* 🌿 Premium Rich Army Green Gradient Overlay Layer 🌿 */}
              <View className="absolute inset-0 bg-gradient-to-b from-[#1C3326]/40 via-[#14261C]/80 to-[#0B140E]" />

              {/* Text Overlay Wrapper — fades out as the section collapses */}
              <Animated.View
                className="px-8 pb-10 z-10"
                style={{ opacity: animatedContentOpacity }}
                pointerEvents={isFocused ? "none" : "auto"}
              >
                <Text className="text-white text-3xl font-extrabold tracking-tight">
                  {CAROUSEL_SLIDES[activeSlide].title}
                </Text>

                <Text className="text-emerald-100/90 text-sm mt-2 leading-5 min-h-[40px]">
                  {CAROUSEL_SLIDES[activeSlide].message}
                </Text>

                {/* Progress Indicator Dots */}
                <View className="flex-row gap-1.5 mt-4">
                  {CAROUSEL_SLIDES.map((_, index) => (
                    <View
                      key={index}
                      className={`h-1.5 rounded-full ${
                        index === activeSlide
                          ? "w-5 bg-emerald-400"
                          : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </View>
              </Animated.View>
            </ImageBackground>
          </Animated.View>

          {/* ── BOTTOM SECTION: Compact, Pure White Form Area ── */}
          <View
            className="flex-1 bg-white px-8 pt-8 -mt-6 rounded-t-3xl"
            style={{ paddingBottom: (insets?.bottom ?? 0) + 24 }}
          >
            <Text className="text-gray-900 text-xl font-bold mb-1">
              Staff Sign In
            </Text>
            <Text className="text-gray-400 text-xs mb-6">
              Please enter your account details
            </Text>

            {/* Error Alert Box */}
            {error !== "" ? (
              <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-xs font-semibold">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Email Input Field */}
            <View className="mb-4">
              <Text className="text-gray-700 text-sm font-bold uppercase  mb-1.5">
                Email Address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="yourname@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-sm"
              />
            </View>

            {/* Password Input Field */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-bold uppercase  mb-1.5">
                Password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 py-3.5 text-gray-900 text-sm"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="pl-2 py-2"
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#9CA3AF" />
                  ) : (
                    <Eye size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Button */}
            {loading ? (
              <View className="w-full rounded-xl py-4 items-center justify-center flex-row bg-emerald-800 shadow-md">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-white font-medium text-sm ml-2.5">
                  Verifying info
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.9}
                className="w-full rounded-xl py-4 items-center justify-center flex-row bg-[#053420] shadow-md"
              >
                <Text className="text-white font-bold text-xl tracking-wide mr-2">
                  Access Dashboard
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
