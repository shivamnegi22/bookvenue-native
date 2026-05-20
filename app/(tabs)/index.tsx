import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Filter, Star, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { venueApi } from '@/api/venueApi';
import { useRouter } from 'expo-router';
import { Venue } from '@/types/venue';
import VenueCard from '@/components/VenueCard';
import ProfileAvatar from '@/components/ProfileAvatar';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [featuredVenues, setFeaturedVenues] = useState<Venue[]>([]);
  const [nearbyVenues, setNearbyVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filterByCategory = (venueList: Venue[]) => {
    if (!selectedCategory) return venueList;
    const cat = selectedCategory.toLowerCase();
    return venueList.filter(venue =>
      venue.type.toLowerCase().includes(cat) ||
      venue.services?.some(s => s.name.toLowerCase().includes(cat)) ||
      venue.category?.some(c => c.toLowerCase().includes(cat))
    );
  };

  const displayedFeatured = useMemo(() => filterByCategory(featuredVenues), [featuredVenues, selectedCategory]);
  const displayedNearby = useMemo(() => filterByCategory(nearbyVenues), [nearbyVenues, selectedCategory]);

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(prev => prev === category ? null : category);
  };

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await venueApi.getVenues();
        setVenues(response);

        // Set featured venues (for demo, using top rated venues)
        const featured = [...response]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5);
        setFeaturedVenues(featured);

        // Set nearby venues (for demo, using random venues)
        const nearby = [...response]
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);
        setNearbyVenues(nearby);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/(tabs)/explore',
        params: { query: searchQuery }
      });
    } else {
      router.push('/(tabs)/explore');
    }
  };

  const handleShowAll = (type: string) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { filter: type }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              Hello, {user?.name?.split(' ')[0] || 'Welcome'}
            </Text>
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.locationText}>
                {user?.address || 'Explore venues near you'}
              </Text>
            </View>
          </View>
          {user ? (
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <ProfileAvatar
                name={user.name || 'User'}
                size={40}
                backgroundColor="#2563EB"
                textColor="#FFFFFF"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => router.push('/(tabs)/explore')}>
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['rgba(37, 99, 235, 0.9)', 'rgba(37, 99, 235, 0.7)']}
            style={styles.banner}
          >
            <View>
              <Text style={styles.bannerTitle}>Book Your Perfect Venue</Text>
              <Text style={styles.bannerSubtitle}>Get 15% off your first booking</Text>
            </View>
            <TouchableOpacity style={styles.bannerButton} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.bannerButtonText}>Explore</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Venues</Text>
            <TouchableOpacity onPress={() => handleShowAll('featured')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {displayedFeatured.length === 0 ? (
              <View style={styles.emptyCategory}>
                <Text style={styles.emptyCategoryText}>No {selectedCategory} venues found</Text>
              </View>
            ) : (
              displayedFeatured.map((venue) => (
                <VenueCard key={venue.id} venue={venue} size="large" />
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {[
              { name: 'Football', emoji: '⚽', bg: '#EFF6FF' },
              { name: 'Tennis', emoji: '🎾', bg: '#ECFDF5' },
              { name: 'Cricket', emoji: '🏏', bg: '#FEF3F2' },
              { name: 'Basketball', emoji: '🏀', bg: '#F5F3FF' },
              { name: 'Swimming', emoji: '🏊', bg: '#FFEDD5' },
              // Requested sports/activity categories
              { name: 'Badminton', emoji: '🏸', bg: '#EFF6FF' },
              { name: 'Bubble Soccer', emoji: '🫧', bg: '#ECFDF5' },
              { name: 'Go Karting', emoji: '🏎️', bg: '#FEF3F2' },
              { name: 'Pickleball', emoji: '🌕', bg: '#F5F3FF' },
              { name: 'Snooker', emoji: '🎱', bg: '#FFEDD5' },
              { name: 'Table Tennis', emoji: '🏓', bg: '#DBEAFE' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryItem,
                  selectedCategory && selectedCategory !== cat.name && styles.categoryItemInactive,
                ]}
                onPress={() => handleCategoryPress(cat.name)}
              >
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: cat.bg },
                  selectedCategory === cat.name && styles.categoryIconActive,
                ]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === cat.name && styles.categoryNameActive,
                ]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Venues</Text>
            <TouchableOpacity onPress={() => handleShowAll('nearby')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {displayedNearby.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>No {selectedCategory} venues nearby</Text>
            </View>
          ) : (
            displayedNearby.map((venue) => (
              <VenueCard key={venue.id} venue={venue} size="small" />
            ))
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  welcomeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
  },
  bannerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  bannerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563EB',
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  seeAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  categoriesContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoriesScrollContent: {
    paddingTop: 16,
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#1F2937',
  },
  categoryNameActive: {
    color: '#2563EB',
    fontFamily: 'Inter-SemiBold',
  },
  categoryItemInactive: {
    opacity: 0.4,
  },
  categoryIconActive: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  emptyCategory: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
});