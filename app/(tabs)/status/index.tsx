import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Animated,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, Clock, CheckCircle, Circle, XCircle, Package } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { Application } from "@/components/ApplicationCard";
import { StatusBadge, ApplicationStatus } from "@/components/StatusBadge";
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

const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "processing",
  "approved",
  "ready_for_collection",
];

const STATUS_ICONS: Record<string, any> = {
  draft: Circle,
  submitted: Clock,
  processing: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  ready_for_collection: Package,
};

function StatusTimeline({ status }: { status: ApplicationStatus }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;
  const { t } = useLanguage();

  const currentIndex = STATUS_ORDER.indexOf(status);
  const isRejected = status === "rejected";

  const steps = [
    { key: "draft", label: t("status_draft") },
    { key: "submitted", label: t("status_submitted") },
    { key: "processing", label: t("status_processing") },
    { key: "approved", label: t("status_approved") },
    { key: "ready_for_collection", label: t("status_ready") },
  ];

  return (
    <View style={{ marginTop: 12 }}>
      {steps.map((step, index) => {
        const stepIndex = STATUS_ORDER.indexOf(step.key as ApplicationStatus);
        const isCompleted = isRejected ? false : stepIndex < currentIndex;
        const isCurrent = isRejected
          ? step.key === "submitted"
          : stepIndex === currentIndex;
        const isFuture = !isCompleted && !isCurrent;

        const lineColor = isCompleted ? C.primary : C.border;
        const dotColor = isCompleted ? C.primary : isCurrent ? C.accent : C.border;
        const textColor = isCompleted || isCurrent ? C.text : C.textTertiary;

        return (
          <View key={step.key} style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ alignItems: "center", width: 24 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: dotColor,
                  marginTop: 4,
                  borderWidth: isCurrent ? 2 : 0,
                  borderColor: isCurrent ? C.accent : "transparent",
                }}
              />
              {index < steps.length - 1 && (
                <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: lineColor, marginTop: 2 }} />
              )}
            </View>
            <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? "600" : "400",
                  color: textColor,
                  fontFamily: isCurrent ? "Outfit_600SemiBold" : "Outfit_400Regular",
                }}
              >
                {step.label}
              </Text>
              {isCurrent && isRejected && step.key === "submitted" && (
                <Text style={{ fontSize: 11, color: C.danger, fontFamily: "Outfit_400Regular", marginTop: 2 }}>
                  {t("status_rejected")}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ApplicationStatusCard({ application, index }: { application: Application; index: number }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;
  const { t } = useLanguage();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const [expanded, setExpanded] = useState(false);
  const refDisplay = application.reference_number ?? application.id?.slice(0, 8).toUpperCase();
  const typeLabel = application.document_type === "passport" ? t("passport") : t("id_document");
  const dateDisplay = application.created_at
    ? new Date(application.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable
        onPress={() => {
          console.log("[Status] Toggled application card:", application.id);
          setExpanded(!expanded);
        }}
      >
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: C.border,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
                {typeLabel}
              </Text>
              <Text selectable style={{ fontSize: 12, color: C.textTertiary, fontFamily: "SpaceMono", marginTop: 2 }}>
                {refDisplay}
              </Text>
            </View>
            <StatusBadge status={application.status} />
          </View>

          <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 8 }}>
            {t("submitted_on")}
            {": "}
            {dateDisplay}
          </Text>

          {expanded && <StatusTimeline status={application.status} />}

          <Text style={{ fontSize: 12, color: C.primary, fontFamily: "Outfit_600SemiBold", marginTop: 8, textAlign: "center" }}>
            {expanded ? "▲ Hide timeline" : "▼ View timeline"}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function StatusScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    console.log("[Status] Fetching applications for status tracking");
    setError("");
    try {
      const data = await apiGet<{ applications: any[] }>("/api/applications");
      const apps = Array.isArray(data) ? data : (data?.applications ?? []);
      setApplications(apps.map(normalizeApp));
    } catch (e: any) {
      console.log("[Status] Fetch error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const filtered = applications.filter((app) => {
    if (!search) return true;
    const ref = (app.reference_number ?? app.id ?? "").toLowerCase();
    return ref.includes(search.toLowerCase());
  });

  const trackStatusLabel = t("track_status");
  const searchLabel = t("search_reference");
  const noAppsLabel = t("no_applications");

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
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", letterSpacing: -0.3, marginBottom: 12 }}>
          {trackStatusLabel}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: C.border,
            gap: 8,
          }}
        >
          <Search size={18} color={C.textTertiary} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: C.text, fontFamily: "Outfit_400Regular" }}
            placeholder={searchLabel}
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={(v) => {
              console.log("[Status] Search query:", v);
              setSearch(v);
            }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, height: 80 }} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 16, color: C.danger, fontFamily: "Outfit_600SemiBold", marginBottom: 12 }}>
            {t("error_occurred")}
          </Text>
          <AnimatedPressable onPress={fetchApplications}>
            <View style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                {t("try_again")}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Clock size={32} color={C.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", textAlign: "center" }}>
            {noAppsLabel}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ApplicationStatusCard application={item} index={index} />
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
