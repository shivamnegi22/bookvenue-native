import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { bookingApi } from '@/api/bookingApi';
import { Booking } from '@/types/booking';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Clock, MapPin, Star, IndianRupee, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useCallback } from 'react';

export default function BookingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBookings();
      }
    }, [user])
  );

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const response = await bookingApi.getBookings();
      console.log('Fetched bookings:', response);
      setBookings(response);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(error.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // Handle multiple time slots
    if (timeString.includes(',')) {
      const times = timeString.split(',').map(t => t.trim());
      return `${times[0]} - ${times[times.length - 1]}`;
    }
    
    return timeString;
  };

  const isUpcoming = (booking: Booking) => {
    if (!booking.date) return false;
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter(booking => !isUpcoming(booking));

  const currentBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: booking.id }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle2 size={16} color="#10B981" />;
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      case 'cancelled':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <AlertCircle size={16} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <AlertCircle size={64} color="#6B7280" />
          <Text style={styles.notLoggedInTitle}>You're not logged in</Text>
          <Text style={styles.notLoggedInText}>
            Please log in to view your bookings and manage your reservations
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load bookings</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {currentBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                No {activeTab} bookings
              </Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming bookings. Start exploring venues to make your first booking!"
                  : "You don't have any past bookings yet."
                }
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/(tabs)/explore')}
                >
                  <Text style={styles.exploreButtonText}>Explore Venues</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentBookings.map((booking) => (
              <TouchableOpacity 
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => handleBookingPress(booking)}
              >
                <View style={styles.bookingHeader}>
                  <Image 
                    source={{ uri: booking.venue.images[0] }} 
                    style={styles.venueImage}
                  />
                  <View style={styles.bookingInfo}>
                    <Text style={styles.venueName} numberOfLines={1}>
                      {booking.venue.name}
                    </Text>
                    <View style={styles.locationContainer}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {booking.venue.location}
                      </Text>
                    </View>
                    <Text style={styles.courtType}>{booking.venue.type}</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {getStatusIcon(booking.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Calendar size={16} color="#2563EB" />
                      <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Clock size={16} color="#2563EB" />
                      <Text style={styles.detailText}>
                        {booking.startTime && booking.endTime 
                          ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                          : 'Time not specified'
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.priceRow}>
                    <View style={styles.slotsInfo}>
                      {booking.slots && booking.slots > 1 && (
                        <Text style={styles.slotsText}>
                          {booking.slots} slots booked
                        </Text>
                      )}
                    </View>
                    <View style={styles.priceContainer}>
                      <IndianRupee size={16} color="#1F2937" />
                      <Text style={styles.priceText}>₹{booking.totalAmount}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
    lineHeight: 24,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
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
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Account for tab bar
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  exploreButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  venueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
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
    marginLeft: 6,
    flex: 1,
  },
  courtType: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    height: 28,
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginLeft: 4,
  },
  bookingDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotsInfo: {
    flex: 1,
  },
  slotsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 4,
  },
});