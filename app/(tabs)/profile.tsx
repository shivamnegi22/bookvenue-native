import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Image, ActivityIndicator, Linking, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { router, useFocusEffect } from 'expo-router';
import { User, ChevronRight, CreditCard, MapPin, Bell, CircleHelp as HelpCircle, LogOut, Edit2, Shield, BookOpen, Globe } from 'lucide-react-native';
import ProfileAvatar from '@/components/ProfileAvatar';
import BlogCard from '@/components/BlogCard';
import { blogApi } from '@/api/blogApi';
import { Blog } from '@/types/blog';

export default function ProfileScreen() {
  const { user, logout, loading, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Log whenever user state changes
  useEffect(() => {
    console.log('ProfileScreen: user state changed:', user ? 'User exists' : 'No user');
    console.log('ProfileScreen: loading state:', loading);
  }, [user, loading]);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ProfileScreen focused');
      if (user) {
        console.log('User exists, refreshing profile');
        refreshUser();
      } else {
        console.log('No user found on focus');
      }
    }, [])
  );

  // Fetch blogs
  const fetchBlogs = async () => {
    try {
      const blogsData = await blogApi.getBlogs();
      setBlogs(blogsData);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setBlogsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (user) {
      refreshUser();
    }
    fetchBlogs();
  };

  // Show loading only on initial mount when there's no user data
  if (loading && !user) {
    console.log('ProfileScreen: Showing loading indicator');
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15aa9b" />
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    console.log('ProfileScreen: Showing not logged in view');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <User size={64} color="#6B7280" />
          <Text style={styles.notLoggedInTitle}>{t('notLoggedInTitle')}</Text>
          <Text style={styles.notLoggedInText}>{t('notLoggedInText')}</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>{t('goToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('ProfileScreen: Rendering user profile for:', user);

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert(t('oops'), t('failedLogout'));
            }
          },
        },
      ],
    );
  };

  const handleLanguagePress = () => {
    Alert.alert(
      t('selectLanguage'),
      undefined,
      [
        {
          text: t('english'),
          onPress: () => setLanguage('en'),
        },
        {
          text: t('hindi'),
          onPress: () => setLanguage('hi'),
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ],
    );
  };

  const menuItems = [
    // {
    //   icon: <BookOpen size={20} color="#15aa9b" />,
    //   title: 'Blog',
    //   onPress: () => router.push('/blog-list' as any),
    // },
    {
      icon: <MapPin size={20} color="#15aa9b" />,
      title: t('savedAddresses'),
      onPress: () => router.push('/saved-addresses'),
    },
    {
      icon: <Globe size={20} color="#15aa9b" />,
      title: t('language'),
      onPress: handleLanguagePress,
      rightComponent: (
        <View style={styles.languageRight}>
          <Text style={styles.languageValue}>{language === 'en' ? t('english') : t('hindi')}</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      ),
    },
    {
      icon: <Bell size={20} color="#15aa9b" />,
      title: t('notifications'),
      onPress: undefined,
      rightComponent: (
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
          thumbColor={notifications ? '#15aa9b' : '#F3F4F6'}
        />
      ),
    },
    {
      icon: <Shield size={20} color="#15aa9b" />,
      title: t('privacySecurity'),
      onPress: () => router.push('/privacy-security' as any),
    },
    {
      icon: <HelpCircle size={20} color="#15aa9b" />,
      title: t('helpSupport'),
      onPress: () => Linking.openURL('https://bookvenue.app/contact').catch((err) => Alert.alert(t('oops'), t('couldNotOpenLink'))),
    },
  ];

  if (user?.isVenueOwner) {
    menuItems.unshift({
      icon: <User size={20} color="#15aa9b" />,
      title: t('myVenues'),
      onPress: () => Alert.alert(t('comingSoon'), t('venueManagementComingSoon')),
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <ProfileAvatar
                name={user.name || user.phone || 'User'}
                size={100}
                backgroundColor="#15aa9b"
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

          <Text style={styles.userName}>
            {user.name || 'BookVenue User'}
          </Text>
          <Text style={styles.userEmail}>
            {user.email || user.phone || 'No contact info'}
          </Text>

          {user.isVenueOwner && (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>{t('venueOwner')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.editProfileButtonText}>{t('editProfile')}</Text>
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

        {/* Blog Section */}
        <View style={styles.blogSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('latestBlogs')}</Text>
            <TouchableOpacity onPress={() => router.push('/blog-list' as any)}>
              <Text style={styles.seeAllText}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {blogsLoading ? (
            <ActivityIndicator size="large" color="#15aa9b" style={styles.blogLoading} />
          ) : blogs.length > 0 ? (
            <FlatList
              data={blogs}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.blogListContainer}
              renderItem={({ item }) => <BlogCard blog={item} size="large" />}
            />
          ) : (
            <View style={styles.emptyBlogsContainer}>
              <BookOpen size={48} color="#9CA3AF" />
              <Text style={styles.emptyBlogsText}>{t('noBlogsAvailable')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('version')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#1F2937' },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  profileImageContainer: { position: 'relative', marginBottom: 16 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#15aa9b',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  notLoggedInTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 8
  },
  notLoggedInText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24
  },
  loginButton: {
    backgroundColor: '#15aa9b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  loginButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF'
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 4
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  ownerBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16
  },
  ownerBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#15aa9b'
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8
  },
  editProfileButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563'
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB'
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12
  },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  languageRight: { flexDirection: 'row', alignItems: 'center' },
  languageValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8
  },
  logoutButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 8
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40
  },
  versionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF'
  },
  blogSection: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  seeAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#15aa9b',
  },
  blogLoading: {
    marginVertical: 20,
  },
  blogListContainer: {
    paddingHorizontal: 16,
  },
  emptyBlogsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyBlogsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});