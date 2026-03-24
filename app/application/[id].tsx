import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";import { useLocalSearchParams, useRouter } from "expo-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { FormInput } from "@/components/FormInput";
import { StepIndicator } from "@/components/StepIndicator";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiGet, apiPut, apiPost } from "@/utils/api";
import { formatFee } from "@/utils/fees";
import { FileText, Globe, Shield, ChevronRight, Camera, Upload, CheckCircle, Fingerprint } from "lucide-react-native";
interface ApplicationDetail {
  id: string;
  reference_number?: string;
  document_type: "id" | "passport";
  application_subtype: "new" | "renewal";
  status: string;
  fee: number;
  fee_paid?: boolean;
  is_minor?: boolean;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  id_number?: string;
  birth_city?: string;
  birth_province?: string;
  birth_country?: string;
  house_number?: string;
  street?: string;
  suburb?: string;
  city?: string;
  province?: string;
  country?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  guardian_name?: string;
  guardian_surname?: string;
  guardian_id_number?: string;
  birth_certificate_number?: string;
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [birthCertUri, setBirthCertUri] = useState<string | null>(null);
  const [minorFaceUri, setMinorFaceUri] = useState<string | null>(null);

  const isMinor = app?.is_minor ?? false;
  const totalSteps = isMinor ? 7 : 5;

  const stepLabels = [
    t("personal_details"),
    t("place_of_birth"),
    t("address_details"),
    t("contact_details"),
    ...(isMinor ? [t("guardian_details"), t("minor_biometrics")] : []),
    t("review_submit"),
  ];

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    console.log("[ApplicationDetail] Fetching application:", id);
    try {
      const data = await apiGet<any>(`/api/applications/${id}`);
      // Backend wraps fields in a `details` sub-object — flatten it
      const flat: ApplicationDetail = {
        ...data,
        document_type: data.document_type ?? data.application_type,
        fee: data.fee ?? (data.fee_amount ? parseFloat(data.fee_amount) : 0),
        ...(data.details ?? {}),
        // map snake_case detail fields to flat keys
        birth_city: data.details?.place_of_birth_city ?? data.birth_city,
        birth_province: data.details?.place_of_birth_province ?? data.birth_province,
        birth_country: data.details?.place_of_birth_country ?? data.birth_country,
        house_number: data.details?.address_house ?? data.house_number,
        street: data.details?.address_street ?? data.street,
        suburb: data.details?.address_suburb ?? data.suburb,
        city: data.details?.address_city ?? data.city,
        province: data.details?.address_province ?? data.province,
        country: data.details?.address_country ?? data.country,
        phone_primary: data.details?.phone_primary ?? data.phone_primary,
        phone_secondary: data.details?.phone_secondary ?? data.phone_secondary,
        email: data.details?.email ?? data.email,
        id_number: data.details?.id_number ?? data.id_number,
        first_name: data.details?.first_name ?? data.first_name,
        last_name: data.details?.last_name ?? data.last_name,
        date_of_birth: data.details?.date_of_birth ?? data.date_of_birth,
        guardian_name: data.details?.guardian_name ?? data.guardian_name,
        guardian_surname: data.details?.guardian_surname ?? data.guardian_surname,
        guardian_id_number: data.details?.guardian_id_number ?? data.guardian_id_number,
        birth_certificate_number: data.details?.birth_certificate_number ?? data.birth_certificate_number,
      };
      setApp(flat);
    } catch (e: any) {
      console.log("[ApplicationDetail] Fetch error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (updates: Partial<ApplicationDetail>) => {
    if (!app) return;
    console.log("[ApplicationDetail] Saving progress for step:", currentStep);
    setSaving(true);
    try {
      await apiPut(`/api/applications/${id}`, {
        first_name: updates.first_name,
        last_name: updates.last_name,
        date_of_birth: updates.date_of_birth,
        id_number: updates.id_number,
        place_of_birth_city: updates.birth_city,
        place_of_birth_province: updates.birth_province,
        place_of_birth_country: updates.birth_country,
        address_house: updates.house_number,
        address_street: updates.street,
        address_suburb: updates.suburb,
        address_city: updates.city,
        address_province: updates.province,
        address_country: updates.country,
        phone_primary: updates.phone_primary,
        phone_secondary: updates.phone_secondary,
        email: updates.email,
        guardian_name: updates.guardian_name,
        guardian_surname: updates.guardian_surname,
        guardian_id_number: updates.guardian_id_number,
        birth_certificate_number: updates.birth_certificate_number,
      });
    } catch (e: any) {
      console.log("[ApplicationDetail] Save error:", e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    console.log("[ApplicationDetail] Next step from:", currentStep);
    if (app) await saveProgress(app);
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    console.log("[ApplicationDetail] Back from step:", currentStep);
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    console.log("[ApplicationDetail] Submitting application:", id);
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/applications/${id}/submit`, {});
      console.log("[ApplicationDetail] Application submitted successfully");
      router.replace(`/application/submitted/${id}`);
    } catch (e: any) {
      console.log("[ApplicationDetail] Submit error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = () => {
    console.log("[ApplicationDetail] Proceeding to payment for:", id);
    router.push(`/application/payment/${id}`);
  };

  const updateField = (key: keyof ApplicationDetail, value: string) => {
    setApp((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!app) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background, padding: 32 }}>
        <Text style={{ fontSize: 16, color: C.danger, fontFamily: "Outfit_600SemiBold", marginBottom: 16 }}>
          {error || t("error_occurred")}
        </Text>
        <AnimatedPressable onPress={() => router.back()}>
          <View style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: "#FFF", fontFamily: "Outfit_600SemiBold" }}>
              {t("back")}
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const feeDisplay = formatFee(app.fee ?? 0);
  const isPassport = app.document_type === "passport";
  const typeLabel = isPassport ? t("passport") : t("id_document");
  const subtypeLabel = app.application_subtype === "new" ? t("new_application") : t("renewal");
  const refDisplay = app.reference_number ?? app.id?.slice(0, 8).toUpperCase();
  const reviewStep = isMinor ? 6 : 4;
  const isReviewStep = currentStep === reviewStep;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StepIndicator steps={stepLabels} currentStep={currentStep} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0: Personal Details */}
        {currentStep === 0 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("personal_details")}
            </Text>
            <FormInput label={t("first_name")} value={app.first_name ?? ""} onChangeText={(v) => updateField("first_name", v)} required autoCapitalize="words" />
            <FormInput label={t("last_name")} value={app.last_name ?? ""} onChangeText={(v) => updateField("last_name", v)} required autoCapitalize="words" />
            <FormInput label={t("date_of_birth")} value={app.date_of_birth ?? ""} onChangeText={(v) => updateField("date_of_birth", v)} placeholder="YYYY-MM-DD" required />
            <FormInput label={t("id_number")} value={app.id_number ?? ""} onChangeText={(v) => updateField("id_number", v)} keyboardType="numeric" required />
          </View>
        )}

        {/* Step 1: Place of Birth */}
        {currentStep === 1 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("place_of_birth")}
            </Text>
            <FormInput label={t("city")} value={app.birth_city ?? ""} onChangeText={(v) => updateField("birth_city", v)} required />
            <FormInput label={t("province")} value={app.birth_province ?? ""} onChangeText={(v) => updateField("birth_province", v)} />
            <FormInput label={t("country")} value={app.birth_country ?? "South Africa"} onChangeText={(v) => updateField("birth_country", v)} required />
          </View>
        )}

        {/* Step 2: Address */}
        {currentStep === 2 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("address_details")}
            </Text>
            <LocationPrefillButton onPrefill={(city, province) => {
              updateField("city", city);
              updateField("province", province);
              updateField("country", "South Africa");
            }} C={C} t={t} />
            <FormInput label={t("house_number")} value={app.house_number ?? ""} onChangeText={(v) => updateField("house_number", v)} required />
            <FormInput label={t("street")} value={app.street ?? ""} onChangeText={(v) => updateField("street", v)} required />
            <FormInput label={t("suburb")} value={app.suburb ?? ""} onChangeText={(v) => updateField("suburb", v)} />
            <FormInput label={t("city")} value={app.city ?? ""} onChangeText={(v) => updateField("city", v)} required />
            <FormInput label={t("province")} value={app.province ?? ""} onChangeText={(v) => updateField("province", v)} required />
            <FormInput label={t("country")} value={app.country ?? "South Africa"} onChangeText={(v) => updateField("country", v)} required />
          </View>
        )}

        {/* Step 3: Contact */}
        {currentStep === 3 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("contact_details")}
            </Text>
            <FormInput label={t("phone_number")} value={app.phone_primary ?? ""} onChangeText={(v) => updateField("phone_primary", v)} keyboardType="phone-pad" required />
            <FormInput label={t("phone_secondary")} value={app.phone_secondary ?? ""} onChangeText={(v) => updateField("phone_secondary", v)} keyboardType="phone-pad" />
            <FormInput label={t("email_address")} value={app.email ?? ""} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
          </View>
        )}

        {/* Step 4 (minor): Guardian Details */}
        {currentStep === 4 && isMinor && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("guardian_details")}
            </Text>
            <FormInput label={t("guardian_name")} value={app.guardian_name ?? ""} onChangeText={(v) => updateField("guardian_name", v)} required autoCapitalize="words" />
            <FormInput label={t("guardian_surname")} value={app.guardian_surname ?? ""} onChangeText={(v) => updateField("guardian_surname", v)} required autoCapitalize="words" />
            <FormInput label={t("guardian_id_number")} value={app.guardian_id_number ?? ""} onChangeText={(v) => updateField("guardian_id_number", v)} keyboardType="numeric" required />
            <FormInput label={t("birth_certificate_number")} value={app.birth_certificate_number ?? ""} onChangeText={(v) => updateField("birth_certificate_number", v)} required />

            {/* Birth certificate upload */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold", marginBottom: 8 }}>
              {t("upload_birth_certificate")} *
            </Text>
            <AnimatedPressable
              onPress={async () => {
                try {
                  const ImagePicker = require("expo-image-picker");
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== "granted") {
                    Alert.alert("Permission needed", "Please allow access to your photo library.");
                    return;
                  }
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.7,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setBirthCertUri(result.assets[0].uri);
                    updateField("birth_certificate_url", result.assets[0].uri);
                  }
                } catch (e) {
                  console.log("[ApplicationDetail] Birth cert upload error:", e);
                }
              }}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderColor: birthCertUri ? C.primary : C.border,
                  borderStyle: birthCertUri ? "solid" : "dashed",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  backgroundColor: birthCertUri ? C.primaryMuted : C.surfaceSecondary,
                  marginBottom: 16,
                  flexDirection: "row",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                {birthCertUri ? (
                  <>
                    <CheckCircle size={22} color={C.primary} />
                    <Text style={{ fontSize: 14, color: C.primary, fontFamily: "Outfit_600SemiBold" }}>
                      {t("photo_uploaded")}
                    </Text>
                  </>
                ) : (
                  <>
                    <Upload size={22} color={C.textTertiary} />
                    <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                      {t("upload_birth_certificate")}
                    </Text>
                  </>
                )}
              </View>
            </AnimatedPressable>
          </View>
        )}

        {/* Step 5 (minor): Minor Biometrics */}
        {currentStep === 5 && isMinor && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
              {t("minor_biometrics")}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginBottom: 24, lineHeight: 20 }}>
              {t("minor_biometrics_sub")}
            </Text>

            {/* Face photo capture */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold", marginBottom: 10 }}>
              {t("capture_minor_face")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <AnimatedPressable
                style={{ flex: 1 }}
                onPress={async () => {
                  try {
                    const ImagePicker = require("expo-image-picker");
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert("Camera permission needed", "Please allow camera access.");
                      return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.6,
                      cameraType: ImagePicker.CameraType.front,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setMinorFaceUri(result.assets[0].uri);
                    }
                  } catch (e) {
                    console.log("[ApplicationDetail] Minor face capture error:", e);
                  }
                }}
              >
                <View style={{ backgroundColor: C.primaryMuted, borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: C.primary }}>
                  <Camera size={18} color={C.primary} />
                  <Text style={{ fontSize: 14, color: C.primary, fontFamily: "Outfit_600SemiBold" }}>
                    {t("capture_photo")}
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                style={{ flex: 1 }}
                onPress={async () => {
                  try {
                    const ImagePicker = require("expo-image-picker");
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.6,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setMinorFaceUri(result.assets[0].uri);
                    }
                  } catch (e) {
                    console.log("[ApplicationDetail] Minor face gallery error:", e);
                  }
                }}
              >
                <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: C.border }}>
                  <Upload size={18} color={C.textSecondary} />
                  <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                    {t("upload_photo")}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>

            {minorFaceUri ? (
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Image source={{ uri: minorFaceUri }} style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: C.primary }} />
                <Text style={{ fontSize: 13, color: C.primary, fontFamily: "Outfit_600SemiBold", marginTop: 10 }}>
                  {t("minor_face_captured")}
                </Text>
              </View>
            ) : (
              <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: C.surfaceSecondary, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 2, borderColor: C.border, borderStyle: "dashed" }}>
                <Camera size={36} color={C.textTertiary} />
              </View>
            )}

            {/* Mock fingerprint capture */}
            <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Fingerprint size={20} color={C.primary} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
                  Fingerprint Capture (Mock)
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginBottom: 14, lineHeight: 18 }}>
                In the full system, a fingerprint scanner device would be used here. For this prototype, fingerprint capture is simulated.
              </Text>
              <AnimatedPressable onPress={() => Alert.alert("Fingerprint Captured", "Mock fingerprint data recorded successfully.")}>
                <View style={{ backgroundColor: C.primaryMuted, borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                  <Fingerprint size={18} color={C.primary} />
                  <Text style={{ fontSize: 14, color: C.primary, fontFamily: "Outfit_600SemiBold" }}>
                    Simulate Fingerprint Scan
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Review step */}
        {isReviewStep && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 20 }}>
              {t("review_submit")}
            </Text>

            {/* Application summary */}
            <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isPassport ? "rgba(201,168,76,0.12)" : C.primaryMuted, alignItems: "center", justifyContent: "center" }}>
                  {isPassport ? <Globe size={20} color={C.gold} /> : <FileText size={20} color={C.primary} />}
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                    {typeLabel}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                    {subtypeLabel}
                  </Text>
                </View>
              </View>
              <ReviewRow label={t("reference_number")} value={refDisplay} mono C={C} />
              <ReviewRow label={t("fee")} value={feeDisplay} C={C} />
            </View>

            <ReviewSection title={t("personal_details")} C={C}>
              <ReviewRow label={t("first_name")} value={app.first_name} C={C} />
              <ReviewRow label={t("last_name")} value={app.last_name} C={C} />
              <ReviewRow label={t("date_of_birth")} value={app.date_of_birth} C={C} />
              <ReviewRow label={t("id_number")} value={app.id_number} C={C} />
            </ReviewSection>

            <ReviewSection title={t("place_of_birth")} C={C}>
              <ReviewRow label={t("city")} value={app.birth_city} C={C} />
              <ReviewRow label={t("country")} value={app.birth_country} C={C} />
            </ReviewSection>

            <ReviewSection title={t("address_details")} C={C}>
              <ReviewRow label={t("house_number")} value={app.house_number} C={C} />
              <ReviewRow label={t("street")} value={app.street} C={C} />
              <ReviewRow label={t("city")} value={app.city} C={C} />
              <ReviewRow label={t("province")} value={app.province} C={C} />
            </ReviewSection>

            <ReviewSection title={t("contact_details")} C={C}>
              <ReviewRow label={t("phone_number")} value={app.phone_primary} C={C} />
              <ReviewRow label={t("email_address")} value={app.email} C={C} />
            </ReviewSection>

            {isMinor && (
              <ReviewSection title={t("guardian_details")} C={C}>
                <ReviewRow label={t("guardian_name")} value={app.guardian_name} C={C} />
                <ReviewRow label={t("guardian_surname")} value={app.guardian_surname} C={C} />
                <ReviewRow label={t("guardian_id_number")} value={app.guardian_id_number} C={C} />
              </ReviewSection>
            )}

            {/* Fee display */}
            <View style={{ backgroundColor: C.primaryMuted, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                {t("fee")}
              </Text>
              <Text style={{ fontSize: 32, fontWeight: "700", color: C.primary, fontFamily: "Outfit_700Bold", marginTop: 4 }}>
                {feeDisplay}
              </Text>
            </View>

            {!!error && (
              <Text style={{ fontSize: 13, color: C.danger, fontFamily: "Outfit_400Regular", marginBottom: 16 }}>
                {error}
              </Text>
            )}
          </View>
        )}

        {/* Navigation buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          <AnimatedPressable onPress={handleBack} style={{ flex: 1 }}>
            <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                {t("back")}
              </Text>
            </View>
          </AnimatedPressable>

          {!isReviewStep ? (
            <AnimatedPressable onPress={handleNext} disabled={saving} style={{ flex: 2 }}>
              <View style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("next")}
                  </Text>
                )}
              </View>
            </AnimatedPressable>
          ) : (app.fee ?? 0) > 0 ? (
            <AnimatedPressable onPress={handlePayment} style={{ flex: 2 }}>
              <View style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                  {t("proceed_to_payment")}
                </Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={handleSubmit} disabled={submitting} style={{ flex: 2 }}>
              <View style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("submit_application")}
                  </Text>
                )}
              </View>
            </AnimatedPressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ReviewSection({ title, children, C }: { title: string; children: React.ReactNode; C: typeof COLORS }) {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ReviewRow({ label, value, mono, C }: { label: string; value?: string; mono?: boolean; C: typeof COLORS }) {
  const displayValue = value ?? "—";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", flex: 1 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{ fontSize: 13, color: C.text, fontFamily: mono ? "SpaceMono" : "Outfit_400Regular", flex: 1, textAlign: "right" }}
        numberOfLines={1}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function LocationPrefillButton({
  onPrefill,
  C,
  t,
}: {
  onPrefill: (city: string, province: string) => void;
  C: typeof COLORS;
  t: (key: string) => string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handlePrefill = async () => {
    setLoading(true);
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const city = geo.city ?? geo.subregion ?? "";
        const province = geo.region ?? "";
        onPrefill(city, province);
        setDone(true);
      }
    } catch (e) {
      console.log("[LocationPrefill] Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPressable onPress={handlePrefill} disabled={loading || done} style={{ marginBottom: 16 }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: done ? C.primaryMuted : C.surfaceSecondary,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: done ? C.primary : C.border,
      }}>
        {loading ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : done ? (
          <CheckCircle size={18} color={C.primary} />
        ) : (
          <Text style={{ fontSize: 16 }}>📍</Text>
        )}
        <Text style={{ fontSize: 13, color: done ? C.primary : C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
          {done ? "Location pre-filled" : "Use my current location"}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
