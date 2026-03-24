import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS, DARK_COLORS } from '@/constants/Colors';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isFuture = index > currentStep;

        const circleColor = isCompleted
          ? C.primary
          : isCurrent
          ? C.primary
          : C.surfaceSecondary;

        const borderColor = isCompleted
          ? C.primary
          : isCurrent
          ? C.primary
          : C.border;

        const textColor = isCompleted || isCurrent ? '#FFFFFF' : C.textTertiary;

        return (
          <React.Fragment key={index}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: circleColor,
                  borderWidth: 2,
                  borderColor: borderColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCompleted ? (
                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: textColor,
                      fontFamily: 'Outfit_700Bold',
                    }}
                  >
                    {String(index + 1)}
                  </Text>
                )}
              </View>
            </View>
            {index < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: index < currentStep ? C.primary : C.border,
                  marginHorizontal: 4,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
