import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  useColorScheme,
} from 'react-native';
import { COLORS, DARK_COLORS } from '@/constants/Colors';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormInput({ label, error, required, style, ...props }: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>
          {label}
        </Text>
        {required && (
          <Text style={{ fontSize: 13, color: C.danger, marginLeft: 2 }}>
            {'*'}
          </Text>
        )}
      </View>
      <TextInput
        style={[
          {
            backgroundColor: C.surfaceSecondary,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: error ? C.danger : focused ? C.primary : C.border,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 15,
            color: C.text,
            fontFamily: 'Outfit_400Regular',
          },
          style,
        ]}
        placeholderTextColor={C.textTertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {!!error && (
        <Text style={{ fontSize: 12, color: C.danger, marginTop: 4, fontFamily: 'Outfit_400Regular' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
