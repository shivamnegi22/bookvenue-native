import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ProfileAvatarProps = {
  name: string | null | undefined; 
  size?: number;
  backgroundColor?: string;
  textColor?: string;
};

export default function ProfileAvatar({
  name,
  size = 40,
  backgroundColor = '#2563EB',
  textColor = '#FFFFFF'
}: ProfileAvatarProps) {

  const getInitials = (fullName: any) => {
    if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
      return 'U';
    }

    const trimmedName = fullName.trim();
    const names = trimmedName.split(/\s+/);

    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    const firstInitial = names[0].charAt(0);
    const lastInitial = names[names.length - 1].charAt(0);

    return (firstInitial + lastInitial).toUpperCase();
  };

  const initials = getInitials(name);
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor
        }
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize,
            color: textColor
          }
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
});