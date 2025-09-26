import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function PrimaryButton({ title, onPress, style, disabled }: Props) {
  return (
    <TouchableOpacity 
      style={[styles.btn, style, disabled && styles.disabled]} 
      activeOpacity={disabled ? 1 : 0.8} 
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#999',
  },
});