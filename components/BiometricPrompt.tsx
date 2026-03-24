import React, { useState, useEffect } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { COLORS, DARK_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface BiometricPromptProps {
  onSuccess: () => void;
  label?: string;
}

export function BiometricPrompt({ onSuccess, label }: BiometricPromptProps) {
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const LocalAuth = require('expo-local-authentication');
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();
      setAvailable(hasHardware && isEnrolled);
    } catch {
      setAvailable(false);
    }
  };

  const handleBiometric = async () => {
    console.log('[BiometricPrompt] Attempting biometric authentication');
    try {
      const LocalAuth = require('expo-local-authentication');
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        console.log('[BiometricPrompt] Biometric authentication succeeded');
        onSuccess();
      } else {
        console.log('[BiometricPrompt] Biometric authentication failed:', result.error);
        setError('Authentication failed. Please try again.');
      }
    } catch (e) {
      console.log('[BiometricPrompt] Biometric error:', e);
      setError('Biometric authentication unavailable.');
    }
  };

  if (!available) return null;

  const buttonLabel = label ?? 'Use Biometrics';

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <AnimatedPressable onPress={handleBiometric}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Fingerprint size={20} color={C.primary} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: C.primary,
              fontFamily: 'Outfit_600SemiBold',
            }}
          >
            {buttonLabel}
          </Text>
        </View>
      </AnimatedPressable>
      {!!error && (
        <Text style={{ fontSize: 12, color: C.danger, marginTop: 6, fontFamily: 'Outfit_400Regular' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
