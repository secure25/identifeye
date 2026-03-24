import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, Globe } from 'lucide-react-native';
import { COLORS, DARK_COLORS } from '@/constants/Colors';
import { StatusBadge, ApplicationStatus } from '@/components/StatusBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { formatFee } from '@/utils/fees';

export interface Application {
  id: string;
  reference_number?: string;
  document_type: 'id' | 'passport';
  application_subtype: 'new' | 'renewal';
  status: ApplicationStatus;
  fee: number;
  fee_paid?: boolean;
  created_at?: string;
  updated_at?: string;
  is_minor?: boolean;
}

interface ApplicationCardProps {
  application: Application;
  index?: number;
}

export function ApplicationCard({ application, index = 0 }: ApplicationCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    console.log('[ApplicationCard] Pressed application:', application.id, application.reference_number);
    router.push(`/application/${application.id}`);
  };

  const isPassport = application.document_type === 'passport';
  const iconColor = isPassport ? C.gold : C.primary;
  const feeDisplay = formatFee(application.fee ?? 0);
  const refDisplay = application.reference_number ?? application.id?.slice(0, 8).toUpperCase();
  const dateDisplay = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const typeLabel = isPassport ? 'Passport' : 'ID Document';
  const subtypeLabel = application.application_subtype === 'new' ? 'New' : 'Renewal';
  const feePaidLabel = application.fee_paid ? 'Paid' : 'Unpaid';
  const feePaidColor = application.fee_paid ? C.primary : C.warning;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={handlePress}>
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: C.border,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isPassport ? 'rgba(201,168,76,0.12)' : C.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {isPassport ? (
                  <Globe size={20} color={iconColor} />
                ) : (
                  <FileText size={20} color={iconColor} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: C.text,
                    fontFamily: 'Outfit_600SemiBold',
                  }}
                >
                  {typeLabel}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    fontFamily: 'Outfit_400Regular',
                    marginTop: 1,
                  }}
                >
                  {subtypeLabel}
                </Text>
              </View>
            </View>
            <StatusBadge status={application.status} />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: C.divider,
              marginVertical: 12,
            }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'Outfit_400Regular' }}>
                REF
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 13,
                  color: C.text,
                  fontFamily: 'SpaceMono',
                  letterSpacing: 0.5,
                  marginTop: 2,
                }}
              >
                {refDisplay}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'Outfit_400Regular' }}>
                DATE
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                {dateDisplay}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: 'Outfit_400Regular' }}>
                FEE
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: C.text,
                  fontFamily: 'Outfit_600SemiBold',
                  marginTop: 2,
                }}
              >
                {feeDisplay}
              </Text>
              {application.fee > 0 && (
                <Text style={{ fontSize: 10, color: feePaidColor, fontFamily: 'Outfit_600SemiBold', marginTop: 1 }}>
                  {feePaidLabel}
                </Text>
              )}
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
