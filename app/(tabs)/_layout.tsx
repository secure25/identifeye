import React from "react";
import { View, useColorScheme } from "react-native";
import { usePathname } from "expo-router";
import { Stack } from "expo-router";
import FloatingTabBar from "@/components/FloatingTabBar";
import { Home, FileText, Clock, User } from "lucide-react-native";
import { COLORS, DARK_COLORS } from "@/constants/Colors";

const TABS = [
  { name: "(home)", route: "/(tabs)/(home)" as const, icon: "home" as any, label: "Home" },
  { name: "applications", route: "/(tabs)/applications" as const, icon: "description" as any, label: "Applications" },
  { name: "status", route: "/(tabs)/status" as const, icon: "schedule" as any, label: "Status" },
  { name: "profile", route: "/(tabs)/profile" as const, icon: "person" as any, label: "Profile" },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="applications" />
        <Stack.Screen name="status" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar
        tabs={TABS}
        containerWidth={340}
        borderRadius={35}
        bottomMargin={20}
      />
    </View>
  );
}
