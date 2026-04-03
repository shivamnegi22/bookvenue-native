import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Trash2, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/authApi';

export default function PrivacySecurityScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://bookvenue.app/privacy').catch(() => {
      Alert.alert('Error', 'Could not open the privacy policy link.');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              setLoading(true);
              await authApi.deleteUser(user.id);
              await logout();
              router.replace('/(auth)/login' as any);
            } catch (error) {
              setLoading(false);
              Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.infoContainer}>
          <Shield size={48} color="#2563EB" style={styles.icon} />
          <Text style={styles.infoTitle}>Your data is safe with us</Text>
          <Text style={styles.infoText}>
            Manage your account security and privacy preferences below.
          </Text>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacyPolicy}
          >
            <View style={styles.menuItemLeft}>
              <ExternalLink size={20} color="#4B5563" />
              <Text style={styles.menuItemTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.deleteItem]}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={20} color="#EF4444" />
              <Text style={[styles.menuItemTitle, styles.deleteText]}>Delete Account</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <ChevronRight size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  icon: {
    marginBottom: 16,
  },
  infoTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuItemTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  deleteItem: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#EF4444',
  },
});
