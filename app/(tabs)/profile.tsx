import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { User, ChevronRight, CreditCard, MapPin, Bell, CircleHelp as HelpCircle, LogOut, CreditCard as Edit2, Shield } from 'lucide-react-native';
import ProfileAvatar from '@/components/ProfileAvatar';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInTitle}>You're not logged in</Text>
          <Text style={styles.notLoggedInText}>Please log in to view your profile</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const menuItems = [
    {
      icon: <CreditCard size={20} color="#2563EB" />,
      title: 'Payment Methods',
      onPress: () => router.push('/payment-methods'),
    },
    {
      icon: <MapPin size={20} color="#2563EB" />,
      title: 'Saved Addresses',
      onPress: () => router.push('/saved-addresses'),
    },
    {
      icon: <Bell size={20} color="#2563EB" />,
      title: 'Notifications',
      onPress: null,
      rightComponent: (
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
          thumbColor={notifications ? '#2563EB' : '#F3F4F6'}
        />
      ),
    },
    {
      icon: <Shield size={20} color="#2563EB" />,
      title: 'Privacy & Security',
      onPress: () => router.push('/privacy-security'),
    },
    {
      icon: <HelpCircle size={20} color="#2563EB" />,
      title: 'Help & Support',
      onPress: () => router.push('/help'),
    },
  ];
  
  if (user?.isVenueOwner) {
    menuItems.unshift({
      icon: <User size={20} color="#2563EB" />,
      title: 'My Venues',
      onPress: () => router.push('/my-venues'),
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {user.profileImage ? (
              <Image 
                source={{ uri: user.profileImage }} 
                style={styles.profileImage}
              />
            ) : (
              <ProfileAvatar 
                name={user?.name || 'User'} 
                size={100}
                backgroundColor="#2563EB"
                textColor="#FFFFFF"
              />
            )}
            <TouchableOpacity 
              style={styles.editImageButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Edit2 size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {user?.isVenueOwner && (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Venue Owner</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              disabled={!item.onPress}
            >
              <View style={styles.menuItemLeft}>
                {item.icon}
                <Text style={styles.menuItemTitle}>{item.title}</Text>
              </View>
              
              <View style={styles.menuItemRight}>
                {item.rightComponent || (
                  <ChevronRight size={20} color="#9CA3AF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 8,
  },
  notLoggedInText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  ownerBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  ownerBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2563EB',
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  editProfileButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
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
    alignItems: 'center',
  },
  menuItemTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  logoutButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
});