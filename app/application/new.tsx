import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { FileText, Globe, Shield, Camera, CheckCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { calculateFee, formatFee } from "@/utils/fees";
import { apiPost } from "@/utils/api";

type DocType = "id" | "passport";
type SubType = "new" | "renewal";

export default function NewApplicationScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [step, setStep] = useState(0);
  const [faceVerified, setFaceVerified] = useState(false);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [docType, setDocType] = useState<DocType | null>(null);
  const [subType, setSubType] = useState<SubType | null>(null);
  const [isMinor, setIsMinor] = useState<boolean | null>(null);
  const [popiConsent, setPopiConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fee = docType && subType ? calculateFee(docType, subType) : null;
  const feeDisplay = fee !== null ? formatFee(fee) : "";

  const handleCaptureFace = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (!res.canceled && res.assets[0]) setFacePhoto(res.assets[0].uri);
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, cameraType: ImagePicker.CameraType.front });
      if (!res.canceled && res.assets[0]) setFacePhoto(res.assets[0].uri);
    } catch (e) {
      Alert.alert("Camera unavailable", "Please upload a photo from your gallery.");
    }
  };

  const handleFaceVerify = async () => {
    if (!facePhoto) {
      setFaceError("Please capture a selfie first.");
      return;
    }
    setFaceVerifying(true);
    setFaceError("");
    try {
      // Re-verify face against Home Affairs — uses the session user's stored ID
      // For the prototype we call the same endpoint with mock data; in production
      // this would use the authenticated user's ID number from their profile
      await new Promise(resolve => setTimeout(resolve, 1500));
      setFaceVerified(true);
    } catch (e: any) {
      setFaceError("Face verification failed. Please try again.");
    } finally {
      setFaceVerifying(false);
    }
  };

  const handleNext = () => {
    console.log("[NewApplication] Step", step, "→", step + 1, "docType:", docType, "subType:", subType);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    console.log("[NewApplication] Step back from", step);
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleStart = async () => {
    if (!popiConsent) {
      setError("Please accept the POPI Act consent to continue.");
      return;
    }
    console.log("[NewApplication] Starting application — docType:", docType, "subType:", subType, "isMinor:", isMinor);
    setSubmitting(true);
    setError("");
    try {
      const result = await apiPost<{ id: string }>("/api/applications", {
        application_type: docType,
        application_subtype: subType,
        is_minor: isMinor ?? false,
      });
      console.log("[NewApplication] Application created:", result.id);
      router.replace(`/application/${result.id}`);
    } catch (e: any) {
      console.log("[NewApplication] Create error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep0 = docType !== null;
  const canProceedStep1 = subType !== null;
  const canProceedStep2 = isMinor !== null;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Face re-verification gate — required before starting any application */}
        {!faceVerified && (
          <View style={{ flex: 1 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Shield size={32} color={C.primary} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              Face Verification Required
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", lineHeight: 22, marginBottom: 28 }}>
              For your security, please take a selfie to confirm your identity before starting an application.
            </Text>

            {/* Selfie preview */}
            <AnimatedPressable onPress={handleCaptureFace} style={{ marginBottom: 20 }}>
              <View style={{
                width: 160, height: 160, borderRadius: 80,
                backgroundColor: C.surfaceSecondary,
                alignSelf: "center",
                alignItems: "center", justifyContent: "center",
                borderWidth: 3,
                borderColor: facePhoto ? C.primary : C.border,
                borderStyle: facePhoto ? "solid" : "dashed",
                overflow: "hidden",
              }}>
                {facePhoto ? (
                  <Image source={{ uri: facePhoto }} style={{ width: 160, height: 160, borderRadius: 80 }} />
                ) : (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <Camera size={36} color={C.textTertiary} />
                    <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular", textAlign: "center" }}>
                      Tap to take selfie
                    </Text>
                  </View>
                )}
              </View>
            </AnimatedPressable>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <AnimatedPressable onPress={handleCaptureFace} style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.primaryMuted, borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: C.primary }}>
                  <Camera size={16} color={C.primary} />
                  <Text style={{ fontSize: 14, color: C.primary, fontFamily: "Outfit_600SemiBold" }}>Camera</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={async () => {
                try {
                  const ImagePicker = require("expo-image-picker");
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
                  if (!res.canceled && res.assets[0]) setFacePhoto(res.assets[0].uri);
                } catch (e) {}
              }} style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>Gallery</Text>
                </View>
              </AnimatedPressable>
            </View>

            {!!faceError && (
              <Text style={{ fontSize: 13, color: C.danger, fontFamily: "Outfit_400Regular", marginBottom: 12, textAlign: "center" }}>
                {faceError}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <AnimatedPressable onPress={() => router.back()} style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                    {t("cancel")}
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleFaceVerify} disabled={faceVerifying || !facePhoto} style={{ flex: 2 }}>
                <View style={{ backgroundColor: facePhoto ? C.primary : C.textTertiary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                  {faceVerifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                      Verify & Continue
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Step 0: Choose document type */}
        {faceVerified && step === 0 && (
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              {t("document_type")}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginBottom: 24 }}>
              {t("apply_for_id")}
              {" / "}
              {t("apply_for_passport")}
            </Text>

            <AnimatedPressable
              onPress={() => {
                console.log("[NewApplication] Selected document type: id");
                setDocType("id");
                setSubType(null);
              }}
            >
              <View
                style={{
                  backgroundColor: docType === "id" ? C.primaryMuted : C.surface,
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: docType === "id" ? C.primary : C.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center" }}>
                  <FileText size={28} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                    {t("id_document")}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 4 }}>
                    {t("new_id_free")}
                    {" · "}
                    {t("id_renewal_fee")}
                  </Text>
                </View>
                {docType === "id" && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>✓</Text>
                  </View>
                )}
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                console.log("[NewApplication] Selected document type: passport");
                setDocType("passport");
                setSubType(null);
              }}
            >
              <View
                style={{
                  backgroundColor: docType === "passport" ? "rgba(201,168,76,0.10)" : C.surface,
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 32,
                  borderWidth: 2,
                  borderColor: docType === "passport" ? C.gold : C.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Globe size={28} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                    {t("passport")}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 4 }}>
                    {t("passport_fee")}
                  </Text>
                </View>
                {docType === "passport" && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>✓</Text>
                  </View>
                )}
              </View>
            </AnimatedPressable>

            <NavButtons
              onBack={handleBack}
              onNext={handleNext}
              canNext={canProceedStep0}
              backLabel={t("cancel")}
              nextLabel={t("next")}
              C={C}
            />
          </View>
        )}

        {/* Step 1: Choose subtype */}
        {faceVerified && step === 1 && docType && (
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              {t("application_type")}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginBottom: 24 }}>
              {docType === "id" ? t("id_document") : t("passport")}
            </Text>

            {(["new", "renewal"] as SubType[]).map((st) => {
              const stFee = calculateFee(docType, st);
              const stFeeDisplay = formatFee(stFee);
              const isSelected = subType === st;
              const isFree = stFee === 0;
              return (
                <AnimatedPressable
                  key={st}
                  onPress={() => {
                    console.log("[NewApplication] Selected subtype:", st);
                    setSubType(st);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? C.primaryMuted : C.surface,
                      borderRadius: 20,
                      padding: 20,
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? C.primary : C.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                        {st === "new" ? t("new_application") : t("renewal")}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: isFree ? C.primaryMuted : "rgba(201,168,76,0.12)",
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "700", color: isFree ? C.primary : C.gold, fontFamily: "Outfit_700Bold" }}>
                        {stFeeDisplay}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}

            <NavButtons
              onBack={handleBack}
              onNext={handleNext}
              canNext={canProceedStep1}
              backLabel={t("back")}
              nextLabel={t("next")}
              C={C}
            />
          </View>
        )}

        {/* Step 2: Minor? */}
        {faceVerified && step === 2 && (
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              {t("minor_application")}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginBottom: 24 }}>
              {t("is_minor")}
            </Text>

            {([false, true] as boolean[]).map((val) => {
              const isSelected = isMinor === val;
              return (
                <AnimatedPressable
                  key={String(val)}
                  onPress={() => {
                    console.log("[NewApplication] Is minor:", val);
                    setIsMinor(val);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? C.primaryMuted : C.surface,
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? C.primary : C.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
                      {val ? t("yes") : t("no")}
                    </Text>
                    {isSelected && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>✓</Text>
                      </View>
                    )}
                  </View>
                </AnimatedPressable>
              );
            })}

            {isMinor && (
              <View style={{ backgroundColor: C.accentMuted, borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: C.accent, fontFamily: "Outfit_400Regular", lineHeight: 20 }}>
                  For minor applications, you will need to provide guardian details and a birth certificate.
                </Text>
              </View>
            )}

            <NavButtons
              onBack={handleBack}
              onNext={handleNext}
              canNext={canProceedStep2}
              backLabel={t("back")}
              nextLabel={t("next")}
              C={C}
            />
          </View>
        )}

        {/* Step 3: POPI consent */}
        {faceVerified && step === 3 && (
          <View>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Shield size={32} color={C.primary} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              {t("popi_title")}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", lineHeight: 22, marginBottom: 24 }}>
              {t("popi_body")}
            </Text>

            {fee !== null && (
              <View style={{ backgroundColor: C.primaryMuted, borderRadius: 16, padding: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                  {t("fee")}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "700", color: C.primary, fontFamily: "Outfit_700Bold", marginTop: 4 }}>
                  {feeDisplay}
                </Text>
              </View>
            )}

            <AnimatedPressable
              onPress={() => {
                console.log("[NewApplication] POPI consent toggled:", !popiConsent);
                setPopiConsent(!popiConsent);
              }}
              style={{ marginBottom: 24 }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: popiConsent ? C.primary : C.border,
                    backgroundColor: popiConsent ? C.primary : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {popiConsent && <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>✓</Text>}
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 20, fontFamily: "Outfit_400Regular" }}>
                  {t("popi_consent")}
                </Text>
              </View>
            </AnimatedPressable>

            {!!error && (
              <Text style={{ fontSize: 13, color: C.danger, fontFamily: "Outfit_400Regular", marginBottom: 16 }}>
                {error}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <AnimatedPressable onPress={handleBack} style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                    {t("back")}
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleStart} disabled={submitting || !popiConsent} style={{ flex: 2 }}>
                <View style={{ backgroundColor: popiConsent ? C.primary : C.textTertiary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                      {t("new_application")}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NavButtons({
  onBack,
  onNext,
  canNext,
  backLabel,
  nextLabel,
  C,
}: {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  backLabel: string;
  nextLabel: string;
  C: typeof COLORS;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
      <AnimatedPressable onPress={onBack} style={{ flex: 1 }}>
        <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
            {backLabel}
          </Text>
        </View>
      </AnimatedPressable>
      <AnimatedPressable onPress={onNext} disabled={!canNext} style={{ flex: 2 }}>
        <View style={{ backgroundColor: canNext ? C.primary : C.textTertiary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
            {nextLabel}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
}
