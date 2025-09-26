import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean; // when true, show eye icon to toggle secure text
}

// A reusable input with left icon and optional password visibility toggle
export default function AuthTextInput({ leftIcon, secureTextEntry, secureToggle, style, ...rest }: Props) {
  const [isSecure, setIsSecure] = useState<boolean>(!!secureTextEntry);

  return (
    <View style={[styles.wrapper, style]}>      
      {leftIcon ? (
        <Ionicons name={leftIcon} size={18} color="#2196F3" style={styles.leftIcon} />
      ) : null}

      <TextInput
        placeholderTextColor="#99A4B1"
        style={styles.input}
        secureTextEntry={isSecure}
        {...rest}
      />

      {secureToggle ? (
        <TouchableOpacity onPress={() => setIsSecure(s => !s)} style={styles.rightIconBtn}>
          <Ionicons name={isSecure ? 'eye-off' : 'eye'} size={18} color="#2196F3" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    color: '#1A1A1A',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIconBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
});