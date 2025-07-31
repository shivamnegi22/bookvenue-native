import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { bookingApi } from '@/api/bookingApi';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types/booking';
import { CalendarClock, MapPin, Clock, CalendarCheck, CalendarX, RotateCcw } from 'lucide-react-native';

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <CalendarX size={48} color="#6B7280" />
          <Text style={styles.notLoggedInTitle}>You're not logged in</Text>
          <Text style={styles.notLoggedInText}>Please log in to view your bookings</Text>
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingApi.getBookings();
      console.log('Fetched bookings:', response);
      setBookings(response);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBookings();
  }, []);
  
  // Refresh bookings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [])
  );
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await bookingApi.getBookings();
        console.log('Fetched bookings:', response);
        setBookings(response);
      } catch (error: any) {
        console.error('Error fetching bookings:', error);
        setError(error.message || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);
  
  // Refresh bookings when screen comes into focus
  useEffect(() => {
    const unsubscribe = router.addListener('focus', () => {
      const fetchBookings = async () => {
        try {
          const response = await bookingApi.getBookings();
          setBookings(response);
        } catch (error: any) {
          console.error('Error refreshing bookings:', error);
        }
      };
      fetchBookings();
    });

    return unsubscribe;
  }, [router]);
  const formattedTime = (time: string) => {
    if (!time) return 'Invalid Time';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid Time';
    }
  };

  const upcomingBookings = bookings.filter(booking => {
    const bookingDateTime = new Date(booking.date + 'T' + booking.startTime);
    return bookingDateTime > new Date();
  });
  
  const pastBookings = bookings.filter(booking => {
    const bookingDateTime = new Date(booking.date + 'T' + booking.startTime);
    return bookingDateTime <= new Date();
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleRebook = (booking: Booking) => {
    // Navigate to venue detail page for rebooking
    router.push({
      pathname: '/explore',

    });
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    // console.log('Rendering booking item:');
    const isUpcoming = new Date(item.date + 'T' + item.startTime) > new Date();
    
    return (
      
      <TouchableOpacity 
        key={item.id}
        style={styles.bookingCard}
        onPress={() => router.push(`/booking/${item.id}`)}
      >
        <View style={styles.bookingHeader}>
          {/* <View style={styles.venueImageContainer}>
            <Image 
              source={{ uri: item.venue.images[0] }} 
              style={styles.venueImage}
              onError={(e) => {
                console.log('Image load error:', e.nativeEvent.error);
              }}
            />
          </View> */}
          <View style={styles.bookingInfo}>
            <Text style={styles.venueName}>{item.venue.name}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.locationText}>{}</Text>
            </View>
            {/* Replace 'court' with the correct property if available, e.g., 'venueType' or remove if not needed */}
            {/* {item.venueType && (
              <Text style={styles.venueType}>{item.venueType}</Text>
            )} */}
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <CalendarCheck size={16} color="#2563EB" />
            <Text style={styles.detailText}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Clock size={16} color="#2563EB" />
            <Text style={styles.detailText}>{formattedTime(item.startTime)} - {formattedTime(item.endTime)}</Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>₹{item.totalAmount}</Text>
          </View>
          
          <View style={styles.rightSection}>
            <View style={[
              styles.statusContainer, 
              item.status === 'confirmed' ? styles.statusConfirmed : 
              item.status === 'pending' ? styles.statusPending : 
              styles.statusCancelled
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'confirmed' ? styles.statusTextConfirmed : 
                item.status === 'pending' ? styles.statusTextPending : 
                styles.statusTextCancelled
              ]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.rebookButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRebook(item);
              }}
            >
              <RotateCcw size={16} color="#2563EB" />
              <Text style={styles.rebookButtonText}>Rebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <CalendarX size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No bookings found</Text>
        <Text style={styles.emptyDescription}>
          {activeTab === 'upcoming' 
            ? "You don't have any upcoming bookings. Start exploring venues to book your next activity!"
            : "You don't have any past bookings."}
        </Text>
        {activeTab === 'upcoming' && (
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.exploreButtonText}>Explore Venues</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderErrorComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <CalendarX size={48} color="#EF4444" />
        <Text style={styles.emptyTitle}>Error loading bookings</Text>
        <Text style={styles.emptyDescription}>{error}</Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Retry fetching bookings
            bookingApi.getBookings()
              .then(setBookings)
              .catch((err) => setError(err.message))
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.exploreButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Bookings</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        renderErrorComponent()
      ) : (
        <FlatList
          data={activeTab === 'upcoming' ? upcomingBookings : pastBookings}
          renderItem={renderBookingItem} 
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
        />
        )} 
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  venueImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  bookingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  venueName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  venueType: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 6,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  priceValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  statusTextConfirmed: {
    color: '#10B981',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  statusTextCancelled: {
    color: '#EF4444',
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  rebookButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2563EB',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  exploreButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
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
    marginTop: 16,
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
});