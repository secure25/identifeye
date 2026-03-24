import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Animated,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, FileText } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { ApplicationCard, Application } from "@/components/ApplicationCard";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiGet } from "@/utils/api";

// Normalize backend response (application_type → document_type, fee_amount → fee)
function normalizeApp(a: any): Application {
  return {
    ...a,
    document_type: a.document_type ?? a.application_type,
    fee: a.fee ?? (a.fee_amount ? parseFloat(a.fee_amount) : 0),
  };
}

type FilterType = "all" | "id" | "passport" | "pending" | "completed";

const FILTERS: { key: FilterType; labelKey: string }[] = [
  { key: "all", labelKey: "all" },
  { key: "id", labelKey: "id_document" },
  { key: "passport", labelKey: "passport" },
  { key: "pending", labelKey: "pending" },
  { key: "completed", labelKey: "completed" },
];

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

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
      style={{
        opacity,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ width: "50%", height: 16, borderRadius: 8, backgroundColor: C.surfaceSecondary }} />
        <View style={{ width: "25%", height: 16, borderRadius: 8, backgroundColor: C.surfaceSecondary }} />
      </View>
      <View style={{ width: "35%", height: 12, borderRadius: 6, backgroundColor: C.surfaceSecondary }} />
      <View style={{ height: 1, backgroundColor: C.divider }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ width: "30%", height: 12, borderRadius: 6, backgroundColor: C.surfaceSecondary }} />
        <View style={{ width: "25%", height: 12, borderRadius: 6, backgroundColor: C.surfaceSecondary }} />
        <View style={{ width: "20%", height: 12, borderRadius: 6, backgroundColor: C.surfaceSecondary }} />
      </View>
    </Animated.View>
  );
}

export default function ApplicationsScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    console.log("[Applications] Fetching all applications");
    setError("");
    try {
      const data = await apiGet<{ applications: any[] }>("/api/applications");
      const apps = Array.isArray(data) ? data : (data?.applications ?? []);
      setApplications(apps.map(normalizeApp));
    } catch (e: any) {
      console.log("[Applications] Fetch error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
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

  const filteredApps = applications.filter((app) => {
    if (filter === "all") return true;
    if (filter === "id") return app.document_type === "id";
    if (filter === "passport") return app.document_type === "passport";
    if (filter === "pending") return ["draft", "submitted", "processing"].includes(app.status);
    if (filter === "completed") return ["approved", "ready_for_collection"].includes(app.status);
    return true;
  });

  const myAppsLabel = t("my_applications");
  const noAppsLabel = t("no_applications");
  const startAppLabel = t("start_application");
  const tryAgainLabel = t("try_again");

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 }}>
          {myAppsLabel}
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log("[Applications] New application button pressed");
            router.push("/application/new");
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={20} color="#FFFFFF" />
          </View>
        </AnimatedPressable>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <AnimatedPressable
              key={f.key}
              onPress={() => {
                console.log("[Applications] Filter changed to:", f.key);
                setFilter(f.key);
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? C.primary : C.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: isActive ? C.primary : C.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : C.textSecondary,
                    fontFamily: "Outfit_600SemiBold",
                  }}
                >
                  {t(f.labelKey)}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={{ padding: 20 }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <FileText size={28} color={C.danger} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginBottom: 8, textAlign: "center" }}>
            {t("error_occurred")}
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 20 }}>
            {error}
          </Text>
          <AnimatedPressable onPress={fetchApplications}>
            <View style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                {tryAgainLabel}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : filteredApps.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <FileText size={32} color={C.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8, textAlign: "center" }}>
            {noAppsLabel}
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 24, maxWidth: 260 }}>
            {t("popi_compliance")}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log("[Applications] Start application from empty state");
              router.push("/application/new");
            }}
          >
            <View style={{ backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                {startAppLabel}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ApplicationCard application={item} index={index} />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
        />
      )}
    </View>
  );
}
