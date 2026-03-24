import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { FileText, Globe, Clock, User, Shield } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { ApplicationCard, Application } from "@/components/ApplicationCard";
import { LanguageSelector } from "@/components/LanguageSelector";
import { apiGet } from "@/utils/api";

function SkeletonLine({ width, height = 14 }: { width: number | string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{ width, height, borderRadius: height / 2, backgroundColor: COLORS.surfaceSecondary, opacity }}
    />
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchApplications();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchApplications = async () => {
    console.log("[Home iOS] Fetching applications");
    try {
      const data = await apiGet<Application[]>("/api/applications");
      setApplications(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (e) {
      console.log("[Home iOS] Failed to fetch applications:", e);
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const greetingText = t("sawubona");
  const recentLabel = t("recent_applications");
  const quickActionsLabel = t("quick_actions");
  const noAppsLabel = t("no_applications");
  const startAppLabel = t("start_application");
  const viewAllLabel = t("view_all");
  const popiLabel = t("popi_compliance");

  const quickActions = [
    {
      key: "apply_id",
      label: t("apply_for_id"),
      icon: FileText,
      color: C.primary,
      bg: C.primaryMuted,
      onPress: () => {
        console.log("[Home iOS] Quick action: Apply for ID");
        router.push("/application/new");
      },
    },
    {
      key: "apply_passport",
      label: t("apply_for_passport"),
      icon: Globe,
      color: C.gold,
      bg: "rgba(201,168,76,0.12)",
      onPress: () => {
        console.log("[Home iOS] Quick action: Apply for Passport");
        router.push("/application/new");
      },
    },
    {
      key: "track_status",
      label: t("track_status"),
      icon: Clock,
      color: C.accent,
      bg: C.accentMuted,
      onPress: () => {
        console.log("[Home iOS] Quick action: Track Status");
        router.push("/(tabs)/status");
      },
    },
    {
      key: "profile",
      label: t("profile"),
      icon: User,
      color: "#0D9488",
      bg: "rgba(13,148,136,0.10)",
      onPress: () => {
        console.log("[Home iOS] Quick action: My Profile");
        router.push("/(tabs)/profile");
      },
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: "IDentifEYE",
          headerRight: () => <LanguageSelector />,
          headerLargeTitle: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: "transparent" },
          headerBlurEffect: "none",
        }}
      />
      <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: C.background }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          {/* Hero card */}
          <LinearGradient
            colors={["#0D2B1E", "#1A7A4A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 20, marginBottom: 20 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Shield size={18} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Outfit_600SemiBold", letterSpacing: 1.5 }}>
                IDENTIFYE
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "Outfit_400Regular" }}>
              {greetingText}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
              {firstName}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4, fontFamily: "Outfit_400Regular" }}>
              {t("digital_identity_hub")}
            </Text>
          </LinearGradient>

          {/* Quick actions */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: C.border,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginBottom: 14 }}>
              {quickActionsLabel}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <AnimatedPressable key={action.key} onPress={action.onPress} style={{ width: "47%" }}>
                    <View
                      style={{
                        backgroundColor: action.bg,
                        borderRadius: 14,
                        padding: 14,
                        alignItems: "flex-start",
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.04)",
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: "rgba(255,255,255,0.6)",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Icon size={18} color={action.color} />
                      </View>
                      <Text
                        style={{ fontSize: 13, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {action.label}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Recent applications */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
                {recentLabel}
              </Text>
              {applications.length > 0 && (
                <AnimatedPressable onPress={() => router.push("/(tabs)/applications")}>
                  <Text style={{ fontSize: 13, color: C.primary, fontFamily: "Outfit_600SemiBold" }}>
                    {viewAllLabel}
                  </Text>
                </AnimatedPressable>
              )}
            </View>

            {loading ? (
              <View style={{ gap: 12 }}>
                {[0, 1].map((i) => (
                  <View key={i} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 }}>
                    <SkeletonLine width="60%" height={16} />
                    <SkeletonLine width="40%" height={12} />
                    <SkeletonLine width="80%" height={12} />
                  </View>
                ))}
              </View>
            ) : applications.length === 0 ? (
              <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <FileText size={28} color={C.primary} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginBottom: 8 }}>
                  {noAppsLabel}
                </Text>
                <AnimatedPressable onPress={() => router.push("/application/new")}>
                  <View style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                      {startAppLabel}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            ) : (
              applications.map((app, i) => (
                <ApplicationCard key={app.id} application={app} index={i} />
              ))
            )}
          </View>

          {/* POPI notice */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primaryMuted, borderRadius: 12, padding: 12 }}>
            <Shield size={14} color={C.primary} />
            <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1, fontFamily: "Outfit_400Regular" }}>
              {popiLabel}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
