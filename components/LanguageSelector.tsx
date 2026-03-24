import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  useColorScheme,
  Pressable,
} from 'react-native';
import { Globe, Check, X } from 'lucide-react-native';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { COLORS, DARK_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const LANGUAGES: { code: Language; flag: string; name: string; native: string }[] = [
  { code: 'en', flag: '🇿🇦', name: 'English', native: 'English' },
  { code: 'af', flag: '🇿🇦', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'zu', flag: '🇿🇦', name: 'isiZulu', native: 'isiZulu' },
  { code: 'xh', flag: '🇿🇦', name: 'isiXhosa', native: 'isiXhosa' },
];

interface LanguageSelectorProps {
  iconColor?: string;
  size?: number;
}

export function LanguageSelector({ iconColor, size = 22 }: LanguageSelectorProps) {
  const [visible, setVisible] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const colorScheme = useColorScheme();
  const C = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  const ic = iconColor ?? C.textSecondary;

  const handleSelect = (lang: Language) => {
    console.log('[LanguageSelector] Selected language:', lang);
    setLanguage(lang);
    setVisible(false);
  };

  return (
    <>
      <AnimatedPressable
        onPress={() => {
          console.log('[LanguageSelector] Opened language picker');
          setVisible(true);
        }}
        style={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backgroundColor: C.primaryMuted,
        }}
      >
        <Globe size={size} color={ic} />
      </AnimatedPressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingBottom: 40,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: C.border,
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: C.text,
                    fontFamily: 'Outfit_700Bold',
                  }}
                >
                  {t('select_language')}
                </Text>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <X size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <AnimatedPressable
                    key={lang.code}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        backgroundColor: isSelected ? C.primaryMuted : 'transparent',
                        marginHorizontal: 12,
                        borderRadius: 12,
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 24, marginRight: 14 }}>{lang.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: isSelected ? C.primary : C.text,
                            fontFamily: 'Outfit_600SemiBold',
                          }}
                        >
                          {lang.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: C.textSecondary,
                            fontFamily: 'Outfit_400Regular',
                          }}
                        >
                          {lang.native}
                        </Text>
                      </View>
                      {isSelected && <Check size={20} color={C.primary} />}
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
