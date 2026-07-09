import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 justify-center items-center">
        <Image
          source={require("../assets/images/logo.jpeg")}
          className="w-[200px] h-[100px] rounded-lg "
        />
        <Text className="mt-5 text-2xl font-bold text-lime-500">
          COMING SOON...
        </Text>
      </View>
    </SafeAreaView>
  );
}
