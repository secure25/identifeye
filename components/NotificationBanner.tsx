import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, useColorScheme } from 'react-native';
import { CheckCircle, Info, AlertTriangle } from 'lucide-react-native';
import { subscribeToNotifications } from '@/utils/notifications';
import { COLORS, DARK_COLORS } from '@/constants/Colors';

interface BannerState {
  message: string;
  type: 'success' | 'info' | 'warning';
  id: number;
}

export function NotificationBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribeToNotifications((message, type) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setBanner({ message, type, id: Date.now() });

      // Slide in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 4s
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setBanner(null));
      }, 4000);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!banner) return null;

  const bgColor = banner.type === 'success'
    ? 'rgba(42,200,100,0.95)'
    : banner.type === 'warning'
    ? 'rgba(245,158,11,0.95)'
    : 'rgba(42,172,226,0.95)';

  const Icon = banner.type === 'success' ? CheckCircle : banner.type === 'warning' ? AlertTriangle : Info;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 12,
        backgroundColor: bgColor,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Icon size={20} color="#FFFFFF" />
      <Text style={{ flex: 1, fontSize: 14, color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold', lineHeight: 19 }}>
        {banner.message}
      </Text>
    </Animated.View>
  );
}
