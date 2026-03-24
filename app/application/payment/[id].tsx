import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shield, Check, CreditCard, Lock } from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiGet, apiPost } from "@/utils/api";
import { formatFee } from "@/utils/fees";
import { emitNotification } from "@/utils/notifications";

interface ApplicationSummary {
  id: string;
  reference_number?: string;
  document_type: "id" | "passport";
  application_subtype: "new" | "renewal";
  fee: number;
  fee_amount?: string;
}

const BANKS = [
  { key: "absa", name: "ABSA", color: "#CC0000", bg: "rgba(204,0,0,0.08)" },
  { key: "capitec", name: "Capitec", color: "#004B87", bg: "rgba(0,75,135,0.08)" },
  { key: "standard_bank", name: "Standard Bank", color: "#0033A0", bg: "rgba(0,51,160,0.08)" },
  { key: "fnb", name: "FNB", color: "#FF6600", bg: "rgba(255,102,0,0.08)" },
  { key: "discovery", name: "Discovery Bank", color: "#7B2D8B", bg: "rgba(123,45,139,0.08)" },
];

type PayStep = "select_bank" | "card_details" | "processing" | "success";

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [app, setApp] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [payStep, setPayStep] = useState<PayStep>("select_bank");
  const [error, setError] = useState("");

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    console.log("[Payment] Fetching application:", id);
    try {
      const data = await apiGet<ApplicationSummary>(`/api/applications/${id}`);
      // Normalize fee field
      const fee = data.fee ?? (data.fee_amount ? parseFloat(data.fee_amount) : 0);
      setApp({ ...data, fee });
    } catch (e: any) {
      console.log("[Payment] Fetch error:", e?.message);
      setError(e?.message ?? t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validateCard = () => {
    const errors: Record<string, string> = {};
    const rawCard = cardNumber.replace(/\s/g, "");
    if (!rawCard || rawCard.length < 16) errors.cardNumber = "Enter a valid 16-digit card number";
    if (!cardName.trim()) errors.cardName = "Cardholder name is required";
    if (!expiry || expiry.length < 5) errors.expiry = "Enter expiry as MM/YY";
    if (!cvv || cvv.length < 3) errors.cvv = "Enter a valid CVV";
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToCard = () => {
    if (!selectedBank) return;
    setPayStep("card_details");
  };

  const handlePay = async () => {
    if (!validateCard()) return;
    console.log("[Payment] Processing payment for application:", id, "bank:", selectedBank);
    setPayStep("processing");
    setError("");

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      await apiPost(`/api/applications/${id}/payment`, {
        payment_method: selectedBank,
        amount: app?.fee ?? 0,
      });

      console.log("[Payment] Payment successful for application:", id);
      setPayStep("success");
      emitNotification(t("notif_payment_success"), "success");

      Animated.spring(successAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();

      // Auto-navigate after success
      setTimeout(() => {
        router.replace(`/application/submitted/${id}`);
      }, 2000);
    } catch (e: any) {
      console.log("[Payment] Payment error:", e?.message);
      setError(e?.message ?? t("payment_failed"));
      setPayStep("card_details");
      progressAnim.setValue(0);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const feeDisplay = formatFee(app?.fee ?? 0);
  const refDisplay = app?.reference_number ?? app?.id?.slice(0, 8).toUpperCase() ?? "—";
  const typeLabel = app?.document_type === "passport" ? t("passport") : t("id_document");
  const subtypeLabel = app?.application_subtype === "new" ? t("new_application") : t("renewal");
  const selectedBankData = BANKS.find(b => b.key === selectedBank);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Application summary card */}
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular", marginBottom: 4 }}>
              {t("reference_number")}
            </Text>
            <Text selectable style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "SpaceMono", letterSpacing: 1, marginBottom: 16 }}>
              {refDisplay}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular" }}>{t("document_type")}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginTop: 2 }}>{typeLabel}</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>{subtypeLabel}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular" }}>{t("fee")}</Text>
                <Text style={{ fontSize: 28, fontWeight: "700", color: C.primary, fontFamily: "Outfit_700Bold", marginTop: 2 }}>{feeDisplay}</Text>
              </View>
            </View>
          </View>

          {/* Step 1: Bank selection */}
          {payStep === "select_bank" && (
            <View>
              <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold", marginBottom: 14 }}>
                {t("select_bank")}
              </Text>
              {BANKS.map((bank) => {
                const isSelected = selectedBank === bank.key;
                return (
                  <AnimatedPressable key={bank.key} onPress={() => { console.log("[Payment] Selected bank:", bank.key); setSelectedBank(bank.key); }}>
                    <View style={{ backgroundColor: isSelected ? bank.bg : C.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: isSelected ? bank.color : C.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bank.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${bank.color}30` }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: bank.color, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 }}>
                            {bank.name.slice(0, 3).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>{bank.name}</Text>
                      </View>
                      {isSelected && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bank.color, alignItems: "center", justifyContent: "center" }}>
                          <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      )}
                    </View>
                  </AnimatedPressable>
                );
              })}

              {!!error && <Text style={{ fontSize: 13, color: C.danger, fontFamily: "Outfit_400Regular", marginTop: 8, textAlign: "center" }}>{error}</Text>}

              <AnimatedPressable onPress={handleProceedToCard} disabled={!selectedBank} style={{ marginTop: 20 }}>
                <View style={{ backgroundColor: selectedBank ? C.primary : C.textTertiary, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                    {t("next")} →
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}

          {/* Step 2: Card details */}
          {payStep === "card_details" && selectedBankData && (
            <View>
              {/* Bank header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, backgroundColor: selectedBankData.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${selectedBankData.color}30` }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: selectedBankData.color, fontFamily: "Outfit_700Bold" }}>
                    {selectedBankData.name.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>{selectedBankData.name}</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>Secure online payment</Text>
                </View>
              </View>

              {/* Mock card visual */}
              <View style={{ backgroundColor: selectedBankData.color, borderRadius: 18, padding: 22, marginBottom: 24, minHeight: 160 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <CreditCard size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Outfit_400Regular" }}>DEBIT / CREDIT</Text>
                </View>
                <Text style={{ fontSize: 18, color: "#FFFFFF", fontFamily: "SpaceMono", letterSpacing: 3, marginBottom: 20 }}>
                  {cardNumber || "•••• •••• •••• ••••"}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "Outfit_400Regular" }}>CARDHOLDER</Text>
                    <Text style={{ fontSize: 13, color: "#FFFFFF", fontFamily: "Outfit_600SemiBold", marginTop: 2 }}>
                      {cardName || "YOUR NAME"}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "Outfit_400Regular" }}>EXPIRES</Text>
                    <Text style={{ fontSize: 13, color: "#FFFFFF", fontFamily: "Outfit_600SemiBold", marginTop: 2 }}>
                      {expiry || "MM/YY"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card form */}
              <CardField
                label="Card Number"
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                error={cardErrors.cardNumber}
                C={C}
              />
              <CardField
                label="Cardholder Name"
                value={cardName}
                onChangeText={setCardName}
                placeholder="As it appears on your card"
                autoCapitalize="characters"
                error={cardErrors.cardName}
                C={C}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <CardField
                    label="Expiry Date"
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    error={cardErrors.expiry}
                    C={C}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CardField
                    label="CVV"
                    value={cvv}
                    onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    keyboardType="numeric"
                    secureTextEntry
                    error={cardErrors.cvv}
                    C={C}
                  />
                </View>
              </View>

              {!!error && <Text style={{ fontSize: 13, color: C.danger, fontFamily: "Outfit_400Regular", marginBottom: 12, textAlign: "center" }}>{error}</Text>}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <AnimatedPressable onPress={() => setPayStep("select_bank")} style={{ flex: 1 }}>
                  <View style={{ backgroundColor: C.surfaceSecondary, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold" }}>{t("back")}</Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={handlePay} style={{ flex: 2 }}>
                  <View style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                      {t("pay_now")} {feeDisplay}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Step 3: Processing */}
          {payStep === "processing" && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
                {t("processing_payment")}
              </Text>
              <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 24 }}>
                Connecting to {selectedBankData?.name}...
              </Text>
              <View style={{ width: "100%", height: 8, backgroundColor: C.surfaceSecondary, borderRadius: 4, overflow: "hidden" }}>
                <Animated.View style={{ height: 8, width: progressWidth, backgroundColor: C.primary, borderRadius: 4 }} />
              </View>
            </View>
          )}

          {/* Step 4: Success */}
          {payStep === "success" && (
            <Animated.View style={{ alignItems: "center", paddingVertical: 40, transform: [{ scale: successAnim }], opacity: successAnim }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(42,200,100,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 3, borderColor: "#2AC864" }}>
                <Check size={52} color="#2AC864" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: "800", color: C.text, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>
                {t("payment_success")}
              </Text>
              <Text style={{ fontSize: 15, color: C.textSecondary, fontFamily: "Outfit_400Regular", textAlign: "center" }}>
                {feeDisplay} paid to {selectedBankData?.name}
              </Text>
            </Animated.View>
          )}

          {/* Security notice */}
          {(payStep === "select_bank" || payStep === "card_details") && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, justifyContent: "center" }}>
              <Lock size={13} color={C.textTertiary} />
              <Text style={{ fontSize: 12, color: C.textTertiary, fontFamily: "Outfit_400Regular" }}>
                {t("secure_payment")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function CardField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  error,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  error?: string;
  C: typeof COLORS;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary, fontFamily: "Outfit_600SemiBold", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          borderWidth: error ? 1.5 : 1,
          borderColor: error ? C.danger : C.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: C.text,
          fontFamily: "Outfit_400Regular",
        }}
      />
      {!!error && (
        <Text style={{ fontSize: 11, color: C.danger, fontFamily: "Outfit_400Regular", marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
