import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { IconSymbol } from "@/components/IconSymbol";
import { useColorScheme } from "react-native";
import { COLORS, DARK_COLORS } from "@/constants/Colors";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <IconSymbol ios_icon_name="house.fill" android_material_icon_name="home" size={24} color={C.primary} />
        <NativeTabs.Label>Home</NativeTabs.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="applications">
        <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={24} color={C.primary} />
        <NativeTabs.Label>Applications</NativeTabs.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="status">
        <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={24} color={C.primary} />
        <NativeTabs.Label>Status</NativeTabs.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={C.primary} />
        <NativeTabs.Label>Profile</NativeTabs.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
