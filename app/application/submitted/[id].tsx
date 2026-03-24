import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, Clock, FileText, Globe } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiGet } from "@/utils/api";
import { formatFee } from "@/utils/fees";
import { emitNotification } from "@/utils/notifications";

interface ApplicationSummary {
  id: string;
  reference_number?: string;
  document_type: "id" | "passport";
  application_subtype: "new" | "renewal";
  fee: number;
  fee_paid?: boolean;
  created_at?: string;
  status: string;
}

const STATUS_STEPS = [
  { key: "draft", labelKey: "status_draft" },
  { key: "submitted", labelKey: "status_submitted" },
  { key: "processing", labelKey: "status_processing" },
  { key: "approved", labelKey: "status_approved" },
  { key: "ready_for_collection", labelKey: "status_ready" },
];

export default function SubmittedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [app, setApp] = useState<ApplicationSummary | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchApplication();
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      emitNotification(t("notif_submitted"), "success");
    });
  }, []);

  const fetchApplication = async () => {
    console.log("[Submitted] Fetching application:", id);
    try {
      const data = await apiGet<ApplicationSummary>(`/api/applications/${id}`);
      setApp(data);
    } catch (e) {
      console.log("[Submitted] Fetch error:", e);
    }
  };

  const refDisplay = app?.reference_number ?? app?.id?.slice(0, 8).toUpperCase() ?? id?.slice(0, 8).toUpperCase();
  const typeLabel = app?.document_type === "passport" ? t("passport") : t("id_document");
  const subtypeLabel = app?.application_subtype === "new" ? t("new_application") : t("renewal");
  const feeDisplay = formatFee(app?.fee ?? 0);
  const dateDisplay = app?.created_at
    ? new Date(app.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const isPassport = app?.document_type === "passport";

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <Animated.View
          style={{
            alignItems: "center",
            marginBottom: 32,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: C.primaryMuted,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              borderWidth: 3,
              borderColor: C.primary,
            }}
          >
            <CheckCircle size={52} color={C.primary} strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "800", color: C.text, fontFamily: "Outfit_700Bold", textAlign: "center", letterSpacing: -0.3 }}>
            {t("application_submitted")}
          </Text>
          <Text style={{ fontSize: 15, color: C.textSecondary, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 8, lineHeight: 22 }}>
            {t("processing_time")}
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Reference number */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular", marginBottom: 6, letterSpacing: 1 }}>
              {t("reference_number").toUpperCase()}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: C.primary,
                fontFamily: "SpaceMono",
                letterSpacing: 2,
              }}
            >
              {refDisplay}
            </Text>
          </View>

          {/* Summary */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isPassport ? "rgba(201,168,76,0.12)" : C.primaryMuted, alignItems: "center", justifyContent: "center" }}>
                {isPassport ? <Globe size={20} color={C.gold} /> : <FileText size={20} color={C.primary} />}
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                  {typeLabel}
                </Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                  {subtypeLabel}
                </Text>
              </View>
            </View>
            <SummaryRow label={t("submitted_on")} value={dateDisplay} C={C} />
            <SummaryRow label={t("fee")} value={feeDisplay} C={C} />
            <SummaryRow label={t("status")} value={t("status_submitted")} C={C} highlight />
          </View>

          {/* Status timeline preview */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 28,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginBottom: 16 }}>
              {t("status_timeline")}
            </Text>
            {STATUS_STEPS.map((step, index) => {
              const isSubmitted = step.key === "submitted";
              const isDone = step.key === "draft";
              const dotColor = isDone ? C.primary : isSubmitted ? C.accent : C.border;
              const textColor = isDone || isSubmitted ? C.text : C.textTertiary;
              return (
                <View key={step.key} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ alignItems: "center", width: 20 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor, marginTop: 4 }} />
                    {index < STATUS_STEPS.length - 1 && (
                      <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: isDone ? C.primary : C.border, marginTop: 2 }} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: isSubmitted ? "600" : "400", color: textColor, fontFamily: isSubmitted ? "Outfit_600SemiBold" : "Outfit_400Regular" }}>
                      {t(step.labelKey)}
                    </Text>
                    {isSubmitted && (
                      <Text style={{ fontSize: 11, color: C.accent, fontFamily: "Outfit_400Regular", marginTop: 2 }}>
                        {t("status_submitted")}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action buttons */}
          <AnimatedPressable
            onPress={() => {
              console.log("[Submitted] Track application pressed");
              router.replace("/(tabs)/status");
            }}
            style={{ marginBottom: 12 }}
          >
            <View style={{ backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                {t("track_my_application")}
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log("[Submitted] Go home pressed");
              router.replace("/(tabs)/(home)");
            }}
          >
            <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 16, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                {t("go_home")}
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, C, highlight }: { label: string; value?: string; C: typeof COLORS; highlight?: boolean }) {
  const displayValue = value ?? "—";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: highlight ? "600" : "400", color: highlight ? C.accent : C.text, fontFamily: highlight ? "Outfit_600SemiBold" : "Outfit_400Regular" }}>
        {displayValue}
      </Text>
    </View>
  );
}
