import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, MapPin, Phone, Globe, Shield, LogOut, Edit, Save, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COLORS, DARK_COLORS } from "@/constants/Colors";
import { FormInput } from "@/components/FormInput";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiGet, apiPost } from "@/utils/api";

interface ProfileData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  id_number?: string;
  house_number?: string;
  street?: string;
  suburb?: string;
  city?: string;
  province?: string;
  country?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const [profile, setProfile] = useState<ProfileData>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    console.log("[Profile] Fetching profile data");
    try {
      const data = await apiGet<any>("/api/profile");
      setProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        place_of_birth: data.place_of_birth_city,
        id_number: data.id_number,
        house_number: data.address_house,
        street: data.address_street,
        suburb: data.address_suburb,
        city: data.address_city,
        province: data.address_province,
        country: data.address_country,
        phone_primary: data.phone_primary,
        phone_secondary: data.phone_secondary,
        email: data.email,
      });
    } catch (e) {
      console.log("[Profile] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log("[Profile] Saving profile data");
    setSaving(true);
    try {
      await apiPost("/api/profile", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        date_of_birth: profile.date_of_birth,
        place_of_birth_city: profile.place_of_birth,
        address_house: profile.house_number,
        address_street: profile.street,
        address_suburb: profile.suburb,
        address_city: profile.city,
        address_province: profile.province,
        address_country: profile.country ?? "South Africa",
        phone_primary: profile.phone_primary ?? "",
        phone_secondary: profile.phone_secondary,
        email: profile.email ?? user?.email ?? "",
        id_number: profile.id_number,
      });
      setEditing(false);
      console.log("[Profile] Profile saved successfully");
    } catch (e: any) {
      console.log("[Profile] Save error:", e?.message);
      Alert.alert(t("error_occurred"), e?.message ?? t("try_again"));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    console.log("[Profile] Sign out pressed");
    Alert.alert(
      t("sign_out"),
      "Are you sure you want to sign out?",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("sign_out"),
          style: "destructive",
          onPress: async () => {
            console.log("[Profile] Confirmed sign out");
            await signOut();
          },
        },
      ]
    );
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const displayName = user?.name ?? user?.email ?? "User";
  const displayEmail = user?.email ?? "";

  const completedFields = [
    profile.first_name,
    profile.last_name,
    profile.date_of_birth,
    profile.id_number,
    profile.phone_primary,
    profile.city,
  ].filter(Boolean).length;
  const totalFields = 6;
  const completionPct = Math.round((completedFields / totalFields) * 100);
  const isComplete = completionPct === 100;
  const completionLabel = isComplete ? t("profile_complete") : t("profile_incomplete");

  const updateField = (key: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 24,
            paddingHorizontal: 20,
            backgroundColor: C.surface,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold", letterSpacing: -0.3 }}>
              {t("profile")}
            </Text>
            <AnimatedPressable
              onPress={() => {
                if (editing) {
                  handleSave();
                } else {
                  console.log("[Profile] Edit mode activated");
                  setEditing(true);
                }
              }}
              disabled={saving}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: editing ? C.primary : C.primaryMuted,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : editing ? (
                  <Save size={16} color="#FFFFFF" />
                ) : (
                  <Edit size={16} color={C.primary} />
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: editing ? "#FFFFFF" : C.primary,
                    fontFamily: "Outfit_600SemiBold",
                  }}
                >
                  {editing ? t("save_profile") : t("edit_profile")}
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* Avatar + name */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: C.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }}>
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Outfit_700Bold" }}>
                {displayName}
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 2 }}>
                {displayEmail}
              </Text>
            </View>
          </View>

          {/* Completion bar */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                {completionLabel}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: isComplete ? C.primary : C.warning, fontFamily: "Outfit_600SemiBold" }}>
                {String(completionPct)}
                {"%"}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.surfaceSecondary, borderRadius: 3 }}>
              <View
                style={{
                  height: 6,
                  width: `${completionPct}%`,
                  backgroundColor: isComplete ? C.primary : C.warning,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          {/* Personal Details */}
          <SectionCard title={t("personal_details")} icon={<User size={18} color={C.primary} />} C={C}>
            {editing ? (
              <>
                <FormInput label={t("first_name")} value={profile.first_name ?? ""} onChangeText={(v) => updateField("first_name", v)} />
                <FormInput label={t("last_name")} value={profile.last_name ?? ""} onChangeText={(v) => updateField("last_name", v)} />
                <FormInput label={t("date_of_birth")} value={profile.date_of_birth ?? ""} onChangeText={(v) => updateField("date_of_birth", v)} placeholder="YYYY-MM-DD" />
                <FormInput label={t("place_of_birth")} value={profile.place_of_birth ?? ""} onChangeText={(v) => updateField("place_of_birth", v)} />
                <FormInput label={t("id_number")} value={profile.id_number ?? ""} onChangeText={(v) => updateField("id_number", v)} keyboardType="numeric" />
              </>
            ) : (
              <>
                <ProfileRow label={t("first_name")} value={profile.first_name} C={C} />
                <ProfileRow label={t("last_name")} value={profile.last_name} C={C} />
                <ProfileRow label={t("date_of_birth")} value={profile.date_of_birth} C={C} />
                <ProfileRow label={t("place_of_birth")} value={profile.place_of_birth} C={C} />
                <ProfileRow label={t("id_number")} value={profile.id_number} C={C} />
              </>
            )}
          </SectionCard>

          {/* Address */}
          <SectionCard title={t("address")} icon={<MapPin size={18} color={C.primary} />} C={C}>
            {editing ? (
              <>
                <FormInput label={t("house_number")} value={profile.house_number ?? ""} onChangeText={(v) => updateField("house_number", v)} />
                <FormInput label={t("street")} value={profile.street ?? ""} onChangeText={(v) => updateField("street", v)} />
                <FormInput label={t("suburb")} value={profile.suburb ?? ""} onChangeText={(v) => updateField("suburb", v)} />
                <FormInput label={t("city")} value={profile.city ?? ""} onChangeText={(v) => updateField("city", v)} />
                <FormInput label={t("province")} value={profile.province ?? ""} onChangeText={(v) => updateField("province", v)} />
                <FormInput label={t("country")} value={profile.country ?? "South Africa"} onChangeText={(v) => updateField("country", v)} />
              </>
            ) : (
              <>
                <ProfileRow label={t("house_number")} value={profile.house_number} C={C} />
                <ProfileRow label={t("street")} value={profile.street} C={C} />
                <ProfileRow label={t("suburb")} value={profile.suburb} C={C} />
                <ProfileRow label={t("city")} value={profile.city} C={C} />
                <ProfileRow label={t("province")} value={profile.province} C={C} />
                <ProfileRow label={t("country")} value={profile.country ?? "South Africa"} C={C} />
              </>
            )}
          </SectionCard>

          {/* Contact */}
          <SectionCard title={t("contact")} icon={<Phone size={18} color={C.primary} />} C={C}>
            {editing ? (
              <>
                <FormInput label={t("phone_number")} value={profile.phone_primary ?? ""} onChangeText={(v) => updateField("phone_primary", v)} keyboardType="phone-pad" />
                <FormInput label={t("phone_secondary")} value={profile.phone_secondary ?? ""} onChangeText={(v) => updateField("phone_secondary", v)} keyboardType="phone-pad" />
              </>
            ) : (
              <>
                <ProfileRow label={t("phone_number")} value={profile.phone_primary} C={C} />
                <ProfileRow label={t("phone_secondary")} value={profile.phone_secondary} C={C} />
                <ProfileRow label={t("email_address")} value={user?.email} C={C} />
              </>
            )}
          </SectionCard>

          {/* Language */}
          <SectionCard title={t("language_preference")} icon={<Globe size={18} color={C.primary} />} C={C}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: C.textSecondary, fontFamily: "Outfit_400Regular" }}>
                {t("select_language")}
              </Text>
              <LanguageSelector />
            </View>
          </SectionCard>

          {/* Security */}
          <SectionCard title={t("security")} icon={<Shield size={18} color={C.primary} />} C={C}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: C.text, fontFamily: "Outfit_400Regular" }}>
                  {t("biometric_login")}
                </Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Outfit_400Regular", marginTop: 2 }}>
                  Coming soon
                </Text>
              </View>
              <Switch
                value={false}
                disabled
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </SectionCard>

          {/* Sign out */}
          <AnimatedPressable onPress={handleSignOut}>
            <View
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.15)",
              }}
            >
              <LogOut size={18} color={C.danger} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.danger, fontFamily: "Outfit_600SemiBold" }}>
                {t("sign_out")}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
  C,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  C: typeof COLORS;
}) {
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {icon}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, fontFamily: "Outfit_600SemiBold" }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ProfileRow({ label, value, C }: { label: string; value?: string; C: typeof COLORS }) {
  const displayValue = value ?? "—";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: "Outfit_400Regular", flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: C.text, fontFamily: "Outfit_400Regular", flex: 1, textAlign: "right" }} numberOfLines={1}>
        {displayValue}
      </Text>
    </View>
  );
}
