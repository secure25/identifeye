import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Shield, CheckCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { FormInput } from "@/components/FormInput";
import { BiometricPrompt } from "@/components/BiometricPrompt";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AnimatedPressable } from "@/components/AnimatedPressable";

export default function AuthScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ verified?: string; id_number?: string; verified_name?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [popiConsent, setPopiConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Home Affairs verification state
  const [haVerified, setHaVerified] = useState(false);
  const [haIdNumber, setHaIdNumber] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Handle return from identity verification
  useEffect(() => {
    if (params.verified === "true" && params.id_number) {
      setHaVerified(true);
      setHaIdNumber(params.id_number);
      setTab("signup");
      if (params.verified_name) {
        setName(params.verified_name);
      }
    }
  }, [params.verified, params.id_number]);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/(home)");
    }
  }, [user]);

  const validateEmail = (val: string) => {
    if (!val) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(val)) return "Enter a valid email address";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required";
    if (val.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleEmailAuth = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    if (tab === "signup" && !popiConsent) {
      setError("Please accept the POPI Act consent to continue.");
      return;
    }
    if (tab === "signup" && !haVerified) {
      setError("Please verify your identity with Home Affairs before registering.");
      return;
    }
    console.log("[AuthScreen] Attempting email auth, tab:", tab, "email:", email);
    setSubmitting(true);
    setError("");
    try {
      if (tab === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (e: any) {
      console.log("[AuthScreen] Email auth error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log("[AuthScreen] Attempting Apple sign in");
    setSubmitting(true);
    setError("");
    try {
      await signInWithApple();
    } catch (e: any) {
      console.log("[AuthScreen] Apple sign in error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    console.log("[AuthScreen] Attempting Google sign in");
    setSubmitting(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.log("[AuthScreen] Google sign in error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricSuccess = () => {
    console.log("[AuthScreen] Biometric success — proceeding with stored session");
  };

  const tabLabel = tab === "signin" ? t("sign_in") : t("sign_up");
  const submitLabel = submitting ? t("loading") : tabLabel;
  const orLabel = t("or");
  const appleLabel = t("continue_with_apple");
  const googleLabel = t("continue_with_google");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#0D2B1E", "#1A7A4A", "#2AACE2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, marginBottom: 32 }}>
            <LanguageSelector iconColor="#FFFFFF" />
          </View>

          {/* Logo */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.primary,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.3)",
                marginBottom: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                ID
              </Text>
            </View>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#FFFFFF", fontFamily: "Outfit_700Bold", letterSpacing: -0.5 }}>
              IDentifEYE
            </Text>
            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", marginTop: 6, fontFamily: "Outfit_400Regular" }}>
              {t("tagline")}
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginHorizontal: 20,
              backgroundColor: colorScheme === "dark" ? DARK_COLORS.surface : "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            }}
          >
            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: C.surfaceSecondary,
                borderRadius: 12,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {(["signin", "signup"] as const).map((t_) => {
                const isActive = tab === t_;
                const label = t_ === "signin" ? t("sign_in") : t("sign_up");
                return (
                  <AnimatedPressable
                    key={t_}
                    onPress={() => {
                      console.log("[AuthScreen] Switched tab to:", t_);
                      setTab(t_);
                      setError("");
                    }}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isActive ? C.primary : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: isActive ? "#FFFFFF" : C.textSecondary,
                          fontFamily: "Outfit_600SemiBold",
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Error */}
            {!!error && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(239,68,68,0.08)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle size={16} color={C.danger} />
                <Text style={{ fontSize: 13, color: C.danger, flex: 1, fontFamily: "Outfit_400Regular" }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Name (signup only) */}
            {tab === "signup" && (
              <FormInput
                label={t("name")}
                placeholder="e.g. Thabo Nkosi"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}

            {/* Home Affairs verification badge (signup only) */}
            {tab === "signup" && (
              haVerified ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(42,200,100,0.08)", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(42,200,100,0.25)" }}>
                  <CheckCircle size={18} color="#2AC864" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#2AC864", fontFamily: "Outfit_600SemiBold" }}>
                      {t("ha_identity_verified")}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                      {t("id_number")}: {haIdNumber}
                    </Text>
                  </View>
                </View>
              ) : (
                <AnimatedPressable onPress={() => router.push("/verify-identity")} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.primaryMuted, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: C.primary, borderStyle: "dashed" }}>
                    <Shield size={20} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: C.primary, fontFamily: "Outfit_600SemiBold" }}>
                        {t("ha_verify_identity")}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 2 }}>
                        {t("ha_verify_required")}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: C.primary }}>→</Text>
                  </View>
                </AnimatedPressable>
              )
            )}

            <FormInput
              label={t("email")}
              placeholder="e.g. thabo@example.co.za"
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
              onBlur={() => setEmailError(validateEmail(email))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
              required
            />

            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>
                  {t("password")}
                </Text>
                <Text style={{ fontSize: 13, color: C.danger, marginLeft: 2 }}>{"*"}</Text>
              </View>
              <View style={{ position: "relative" }}>
                <FormInput
                  label=""
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  secureTextEntry={!showPassword}
                  error={passwordError}
                  style={{ paddingRight: 48 }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: 13 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={C.textTertiary} />
                  ) : (
                    <Eye size={20} color={C.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* POPI consent (signup) */}
            {tab === "signup" && (
              <AnimatedPressable
                onPress={() => {
                  console.log("[AuthScreen] POPI consent toggled:", !popiConsent);
                  setPopiConsent(!popiConsent);
                }}
                style={{ marginBottom: 20 }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: popiConsent ? C.primary : C.border,
                      backgroundColor: popiConsent ? C.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    {popiConsent && (
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18, fontFamily: "Outfit_400Regular" }}>
                    {t("popi_consent")}
                  </Text>
                </View>
              </AnimatedPressable>
            )}

            {/* Submit */}
            <AnimatedPressable onPress={handleEmailAuth} disabled={submitting}>
              <View
                style={{
                  backgroundColor: C.primary,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {submitLabel}
                  </Text>
                )}
              </View>
            </AnimatedPressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <Text style={{ marginHorizontal: 12, fontSize: 13, color: C.textTertiary, fontFamily: "Outfit_400Regular" }}>
                {orLabel}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            </View>

            {/* Apple */}
            <AnimatedPressable onPress={handleApple} disabled={submitting} style={{ marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  backgroundColor: "#000000",
                  borderRadius: 14,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 18, color: "#FFFFFF" }}>🍎</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Outfit_600SemiBold" }}>
                  {appleLabel}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Google */}
            <AnimatedPressable onPress={handleGoogle} disabled={submitting} style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ fontSize: 18 }}>🔵</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
                  {googleLabel}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Biometrics */}
            <BiometricPrompt onSuccess={handleBiometricSuccess} label={t("use_fingerprint")} />
          </Animated.View>

          {/* POPI notice */}
          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              marginTop: 20,
              marginHorizontal: 32,
              fontFamily: "Outfit_400Regular",
              lineHeight: 16,
            }}
          >
            {t("popi_compliance")}
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
