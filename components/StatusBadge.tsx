import React from 'react';
import { View, Text, useColorScheme } from 'react-native';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'ready_for_collection';

const STATUS_CONFIG: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(100,100,100,0.12)', text: '#666', label: 'Draft' },
  submitted: { bg: 'rgba(42,172,226,0.12)', text: '#2AACE2', label: 'Submitted' },
  processing: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'Processing' },
  approved: { bg: 'rgba(26,122,74,0.12)', text: '#1A7A4A', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', label: 'Rejected' },
  ready_for_collection: { bg: 'rgba(13,148,136,0.12)', text: '#0D9488', label: 'Ready' },
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const displayLabel = label ?? config.label;

  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: config.text,
          fontFamily: 'Outfit_600SemiBold',
          letterSpacing: 0.3,
        }}
      >
        {displayLabel.toUpperCase()}
      </Text>
    </View>
  );
}
