import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  useColorScheme,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, Camera, CheckCircle, AlertCircle, Info } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { FormInput } from "@/components/FormInput";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiPost } from "@/utils/api";

type Step = "intro" | "id_entry" | "face_capture" | "verifying" | "verified" | "failed";

export default function VerifyIdentityScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [step, setStep] = useState<Step>("intro");
  const [idNumber, setIdNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState("");
  const [verifiedIdNumber, setVerifiedIdNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [idError, setIdError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const validateSAId = (id: string) => {
    if (!id.trim()) return "ID number is required";
    if (!/^\d{13}$/.test(id.trim())) return "SA ID number must be exactly 13 digits";
    return "";
  };

  const validateName = (val: string, field: string) => {
    if (!val.trim()) return `${field} is required`;
    if (val.trim().length < 2) return `${field} must be at least 2 characters`;
    return "";
  };

  const handleCaptureFace = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        // Fall back to gallery if camera denied
        const galleryResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
        if (!galleryResult.canceled && galleryResult.assets[0]) {
          setFacePhoto(galleryResult.assets[0].uri);
        }
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled && result.assets[0]) {
        setFacePhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.log("[VerifyIdentity] Camera error:", e);
      Alert.alert("Camera unavailable", "Please upload a photo from your gallery instead.");
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setFacePhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.log("[VerifyIdentity] Gallery error:", e);
    }
  };

  const handleVerify = async () => {
    const idErr = validateSAId(idNumber);
    const fnErr = validateName(firstName, "First name");
    const lnErr = validateName(lastName, "Surname");
    setIdError(idErr);
    setFirstNameError(fnErr);
    setLastNameError(lnErr);
    if (idErr || fnErr || lnErr) return;

    if (!facePhoto) {
      setErrorMsg("A face photo is required. Please capture or upload your photo first.");
      animateTransition(() => setStep("failed"));
      return;
    }

    animateTransition(() => setStep("verifying"));

    try {
      const result = await apiPost<{
        verified: boolean;
        first_name?: string;
        last_name?: string;
        id_number?: string;
        message: string;
      }>("/api/home-affairs/verify", {
        id_number: idNumber.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        face_photo: "mock_base64_photo",
      });

      if (result.verified) {
        setVerifiedName(`${result.first_name} ${result.last_name}`);
        setVerifiedIdNumber(result.id_number ?? idNumber.trim());
        animateTransition(() => setStep("verified"));
      } else {
        setErrorMsg(result.message);
        animateTransition(() => setStep("failed"));
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Verification failed. Please try again.");
      animateTransition(() => setStep("failed"));
    }
  };

  const handleContinue = () => {
    router.replace({
      pathname: "/auth-screen",
      params: {
        verified: "true",
        id_number: verifiedIdNumber,
        verified_name: verifiedName,
      },
    });
  };

  return (
    <LinearGradient
      colors={["#0D2B1E", "#1A7A4A", "#2AACE2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>

          {/* Intro */}
          {step === "intro" && (
            <View style={{ flex: 1 }}>
              <View style={{ alignItems: "center", marginBottom: 32 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Shield size={40} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", fontFamily: "Outfit_700Bold", textAlign: "center", letterSpacing: -0.3 }}>
                  {t("ha_verify_title")}
                </Text>
                <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", textAlign: "center", marginTop: 10, lineHeight: 22, fontFamily: "Outfit_400Regular" }}>
                  {t("ha_verify_subtitle")}
                </Text>
              </View>

              <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold", marginBottom: 14 }}>
                  {t("ha_what_you_need")}
                </Text>
                {[
                  t("ha_need_id"),
                  t("ha_need_name"),
                  t("ha_need_surname"),
                  t("ha_need_face"),
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit_400Regular", lineHeight: 20 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Demo hint */}
              <View style={{ backgroundColor: "rgba(42,172,226,0.2)", borderRadius: 14, padding: 14, marginBottom: 28, borderWidth: 1, borderColor: "rgba(42,172,226,0.4)", flexDirection: "row", gap: 10 }}>
                <Info size={18} color="#2AACE2" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit_400Regular", lineHeight: 19 }}>
                  {t("ha_demo_hint")}
                </Text>
              </View>

              <AnimatedPressable onPress={() => animateTransition(() => setStep("id_entry"))}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("ha_start_verification")}
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={() => router.back()} style={{ marginTop: 14 }}>
                <View style={{ paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", fontFamily: "Outfit_400Regular" }}>
                    {t("back")}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}

          {/* ID Entry */}
          {step === "id_entry" && (
            <View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
                {t("ha_enter_details")}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Outfit_400Regular", marginBottom: 28, lineHeight: 20 }}>
                {t("ha_enter_details_sub")}
              </Text>

              <View style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
                <FormInput
                  label={t("id_number")}
                  placeholder="e.g. 9001015009087"
                  value={idNumber}
                  onChangeText={(v) => { setIdNumber(v.replace(/\D/g, "").slice(0, 13)); if (idError) setIdError(""); }}
                  keyboardType="numeric"
                  error={idError}
                  required
                />
                <FormInput
                  label={t("first_name")}
                  placeholder="e.g. Thabo"
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); if (firstNameError) setFirstNameError(""); }}
                  autoCapitalize="words"
                  error={firstNameError}
                  required
                />
                <FormInput
                  label={t("last_name")}
                  placeholder="e.g. Nkosi"
                  value={lastName}
                  onChangeText={(v) => { setLastName(v); if (lastNameError) setLastNameError(""); }}
                  autoCapitalize="words"
                  error={lastNameError}
                  required
                />
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <AnimatedPressable onPress={() => animateTransition(() => setStep("intro"))} style={{ flex: 1 }}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                      {t("back")}
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={() => {
                  const idErr = validateSAId(idNumber);
                  const fnErr = validateName(firstName, "First name");
                  const lnErr = validateName(lastName, "Surname");
                  setIdError(idErr);
                  setFirstNameError(fnErr);
                  setLastNameError(lnErr);
                  if (!idErr && !fnErr && !lnErr) animateTransition(() => setStep("face_capture"));
                }} style={{ flex: 2 }}>
                  <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                      {t("next")}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Face Capture */}
          {step === "face_capture" && (
            <View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
                {t("ha_face_capture")}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Outfit_400Regular", marginBottom: 28, lineHeight: 20 }}>
                {t("ha_face_capture_sub")}
              </Text>

              {/* Photo preview / placeholder */}
              <AnimatedPressable onPress={handleCaptureFace} style={{ marginBottom: 16 }}>
                <View style={{
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignSelf: "center",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: facePhoto ? COLORS.primary : "rgba(255,255,255,0.3)",
                  borderStyle: facePhoto ? "solid" : "dashed",
                  overflow: "hidden",
                  marginBottom: 8,
                }}>
                  {facePhoto ? (
                    <Image source={{ uri: facePhoto }} style={{ width: 180, height: 180, borderRadius: 90 }} />
                  ) : (
                    <View style={{ alignItems: "center", gap: 10 }}>
                      <Camera size={40} color="rgba(255,255,255,0.6)" />
                      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Outfit_400Regular", textAlign: "center" }}>
                        {t("ha_tap_to_capture")}
                      </Text>
                    </View>
                  )}
                </View>
              </AnimatedPressable>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 28 }}>
                <AnimatedPressable onPress={handleCaptureFace} style={{ flex: 1 }}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
                    <Camera size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                      {t("ha_use_camera")}
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={handlePickFromGallery} style={{ flex: 1 }}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
                    <Text style={{ fontSize: 14, color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                      {t("ha_from_gallery")}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <AnimatedPressable onPress={() => animateTransition(() => setStep("id_entry"))} style={{ flex: 1 }}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                      {t("back")}
                    </Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={handleVerify} style={{ flex: 2 }}>
                  <View style={{ backgroundColor: facePhoto ? COLORS.primary : "rgba(255,255,255,0.3)", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                      {t("ha_verify_now")}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Verifying */}
          {step === "verifying" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 10 }}>
                {t("ha_verifying")}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 }}>
                {t("ha_verifying_sub")}
              </Text>
            </View>
          )}

          {/* Verified */}
          {step === "verified" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(42,200,100,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 3, borderColor: "#2AC864" }}>
                <CheckCircle size={52} color="#2AC864" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 10 }}>
                {t("ha_verified")}
              </Text>
              <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 8 }}>
                {t("ha_welcome")}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#2AC864", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 32 }}>
                {verifiedName}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 32, lineHeight: 20, paddingHorizontal: 20 }}>
                {t("ha_verified_sub")}
              </Text>
              <AnimatedPressable onPress={handleContinue} style={{ width: "100%" }}>
                <View style={{ backgroundColor: "#2AC864", borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("ha_continue_register")}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}

          {/* Failed */}
          {step === "failed" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 3, borderColor: "#EF4444" }}>
                <AlertCircle size={52} color="#EF4444" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 12 }}>
                {t("ha_not_verified")}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 32, lineHeight: 20, paddingHorizontal: 16 }}>
                {errorMsg}
              </Text>
              <AnimatedPressable onPress={() => animateTransition(() => setStep("id_entry"))} style={{ width: "100%", marginBottom: 12 }}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("try_again")}
                  </Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={() => router.back()} style={{ width: "100%" }}>
                <View style={{ paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", fontFamily: "Outfit_400Regular" }}>
                    {t("back")}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
