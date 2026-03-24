import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationBanner } from "@/components/NotificationBanner";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function NavigationGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "auth-screen";
    const inPopup = segments[0] === "auth-popup";
    const inCallback = segments[0] === "auth-callback";
    const inVerify = segments[0] === "verify-identity";

    if (!user && !inAuthGroup && !inPopup && !inCallback && !inVerify) {
      router.replace("/auth-screen");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/(home)");
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Outfit_400Regular: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Outfit_500Medium: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Outfit_600SemiBold: require("../assets/fonts/SpaceMono-Bold.ttf"),
    Outfit_700Bold: require("../assets/fonts/SpaceMono-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "#1A7A4A",
      background: "#F0F7F4",
      card: "#FFFFFF",
      text: "#0D2B1E",
      border: "rgba(26,122,74,0.12)",
      notification: "#EF4444",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "#2EAD6A",
      background: "#0A1A12",
      card: "#122010",
      text: "#E8F5EE",
      border: "rgba(46,173,106,0.15)",
      notification: "#EF4444",
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <LanguageProvider>
                <WidgetProvider>
                  <NavigationGuard />
                  <NotificationBanner />
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
                    <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                    <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="application/new"
                      options={{ title: "New Application", headerBackButtonDisplayMode: "minimal" }}
                    />
                    <Stack.Screen
                      name="application/[id]"
                      options={{ title: "Application", headerBackButtonDisplayMode: "minimal" }}
                    />
                    <Stack.Screen
                      name="application/payment/[id]"
                      options={{ title: "Payment", headerBackButtonDisplayMode: "minimal" }}
                    />
                    <Stack.Screen
                      name="application/submitted/[id]"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="verify-identity"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                  <SystemBars style="auto" />
                </WidgetProvider>
              </LanguageProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </>
  );
}
