import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, PanResponder, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { bookingApi } from '@/api/bookingApi';
import { venueApi } from '@/api/venueApi';
import { Booking } from '@/types/booking';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Clock, MapPin, Star, IndianRupee, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle } from 'lucide-react-native';

export default function BookingsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending' | 'past'>('upcoming');

  const bookingTabs: Array<'upcoming' | 'pending' | 'past'> = ['upcoming', 'pending', 'past'];
  const swipeThreshold = 70;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx } = gestureState;
        if (dx <= -swipeThreshold) {
          setActiveTab((current) => {
            const currentIndex = bookingTabs.indexOf(current);
            return bookingTabs[Math.min(currentIndex + 1, bookingTabs.length - 1)];
          });
        } else if (dx >= swipeThreshold) {
          setActiveTab((current) => {
            const currentIndex = bookingTabs.indexOf(current);
            return bookingTabs[Math.max(currentIndex - 1, 0)];
          });
        }
      },
    })
  ).current;

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

    const formatSingleTime = (time: string) => {
      const trimmed = time.trim();
      const [hourPart, minutePart] = trimmed.split(':');
      const hour = parseInt(hourPart, 10);
      const minute = minutePart ? minutePart.padStart(2, '0') : '00';

      if (Number.isNaN(hour)) {
        return trimmed;
      }

      const period = hour >= 12 ? 'PM' : 'AM';
      const normalizedHour = ((hour + 11) % 12) + 1;
      return `${normalizedHour}:${minute} ${period}`;
    };

    if (timeString.includes(',')) {
      const times = timeString.split(',').map(t => formatSingleTime(t));
      return `${times[0]} - ${times[times.length - 1]}`;
    }

    return formatSingleTime(timeString);
  };

  const isUpcoming = (booking: Booking) => {
    if (!booking.date) return false;
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const pendingBookings = sortedBookings.filter(
    booking => booking.status === 'pending' && isUpcoming(booking)
  );

  // Successful bookings go to Upcoming/Past.
  const successfulBookings = sortedBookings.filter(booking => booking.status !== 'pending');
  const upcomingBookings = successfulBookings.filter(isUpcoming);
  const pastBookings = successfulBookings.filter(booking => !isUpcoming(booking));

  const currentBookings =
    activeTab === 'upcoming'
      ? upcomingBookings
      : activeTab === 'pending'
        ? pendingBookings
        : pastBookings;

  const buildResumeTimeSlots = (booking: Booking) => {
    if (booking.timeSlots && booking.timeSlots.length > 0) {
      return booking.timeSlots
        .filter((slot) => slot.startTime && slot.endTime)
        .map((slot) => `${slot.startTime} - ${slot.endTime}`);
    }

    const startTimes = (booking.startTime || '').split(',').map((time) => time.trim()).filter(Boolean);
    const endTimes = (booking.endTime || '').split(',').map((time) => time.trim()).filter(Boolean);

    return startTimes
      .map((startTime, index) => {
        const endTime = endTimes[index];
        return endTime ? `${startTime} - ${endTime}` : '';
      })
      .filter(Boolean);
  };

  const normalizeSlotTime = (slot: string) =>
    slot
      .split(' - ')
      .map((time) => {
        const trimmed = time.trim();
        const [hours, minutes] = trimmed.split(':');

        if (!hours || !minutes) {
          return trimmed;
        }

        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      })
      .join(' - ');

  const arePendingSlotsAvailable = async (booking: Booking, venueId: string, resumeTimeSlots: string[]) => {
    if (!booking.date || !venueId || resumeTimeSlots.length === 0) {
      return true;
    }

    const fetchedSlotsData = await venueApi.getSlotsByDate(booking.date, venueId);
    const services = fetchedSlotsData?.services || [];
    const selectedCourtName = booking.venue.type || '';

    const matchingService = services.find((service: any) => service.name === selectedCourtName);
    const matchingCourt = services
      .flatMap((service: any) => service.courts || service.court || [])
      .find((court: any) => court.court_name === selectedCourtName || court.name === selectedCourtName);
    const resolvedCourt = matchingCourt || (matchingService?.courts?.[0] ?? matchingService?.court?.[0]);

    if (!resolvedCourt?.slots || !Array.isArray(resolvedCourt.slots)) {
      return false;
    }

    const availableSlots = new Set(
      resolvedCourt.slots
        .map((slot: any) => slot.time)
        .filter(Boolean)
        .map(normalizeSlotTime)
    );

    return resumeTimeSlots.every((slot) => availableSlots.has(normalizeSlotTime(slot)));
  };

  const navigateToPendingVenue = (booking: Booking, venueId: string, resumeTimeSlots: string[]) => {
    router.push({
      pathname: '/venue/[id]',
      params: {
        id: venueId,
        resumeDate: booking.date,
        resumeCourtName: booking.venue.type || '',
        resumeTimeSlots: JSON.stringify(resumeTimeSlots),
      }
    });
  };

  const handleBookingPress = async (booking: Booking) => {
    if (activeTab !== 'pending' || booking.status !== 'pending') {
      return;
    }

    let pendingBooking = booking;

    if (!pendingBooking.venue.slug || pendingBooking.venue.slug === 'venue-1') {
      try {
        pendingBooking = await bookingApi.getBookingById(booking.id);
      } catch (error) {
        console.error('Error fetching pending booking details:', error);
      }
    }

    const venueId = pendingBooking.venue.slug || pendingBooking.venue.id;
    const resumeTimeSlots = buildResumeTimeSlots(pendingBooking);
    let pendingSlotsAvailable = true;

    try {
      pendingSlotsAvailable = await arePendingSlotsAvailable(pendingBooking, venueId, resumeTimeSlots);
    } catch (error) {
      console.error('Error checking pending slot availability:', error);
    }

    if (!pendingSlotsAvailable) {
      Alert.alert(
        'slot not available , book another slot?',
        undefined,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => navigateToPendingVenue(pendingBooking, venueId, resumeTimeSlots),
          },
        ]
      );
      return;
    }

    navigateToPendingVenue(pendingBooking, venueId, resumeTimeSlots);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'success':
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
      case 'success':
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
          <Text style={styles.notLoggedInTitle}>{t('notLoggedInTitle')}</Text>
          <Text style={styles.notLoggedInText}>
            {t('notLoggedInText')} {t('myBookings')}
          </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myBookings')}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            {t('upcoming')} ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            {t('pending')} ({pendingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            {t('past')} ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15aa9b" />
          <Text style={styles.loadingText}>{t('loadingBookings')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>{t('failedLoadBookings')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.swipeContainer} {...panResponder.panHandlers}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
          {currentBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>{t('noBookings', { type: t(activeTab) })}</Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'upcoming'
                  ? t('noUpcomingBookings')
                  : activeTab === 'pending'
                    ? t('noPendingBookings')
                    : t('noPastBookings')
                }
              </Text>
              {activeTab === 'upcoming' && (

                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => router.push('/(tabs)/explore')}
                >
                  <Text style={styles.exploreButtonText}>{t('exploreVenues')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentBookings.map((booking) => {
              const isPendingBooking = activeTab === 'pending' && booking.status === 'pending';

              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  onPress={isPendingBooking ? () => handleBookingPress(booking) : undefined}
                  disabled={!isPendingBooking}
                  activeOpacity={isPendingBooking ? 0.2 : 1}
                >
                  <View style={styles.bookingHeader}>
                    <Image
                      source={{ uri: booking.venue.images?.[0] || 'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
                      style={styles.venueImage}
                    />
                    <View style={styles.bookingInfo}>
                      <Text style={styles.venueName} numberOfLines={1}>
                        {booking.venue.name}
                      </Text>
                      <Text style={styles.courtType}>{booking.venue.type}</Text>
                    </View>
                    <View style={styles.statusContainer}>
                      {getStatusIcon(booking.status)}
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
                      <Text style={styles.priceText}>{booking.totalAmount}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Calendar size={16} color="#15aa9b" />
                        <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Clock size={16} color="#15aa9b" />
                        <Text style={styles.detailText}>
                          {booking.startTime && booking.endTime
                            ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                            : 'Time not specified'
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
        </View>
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
    backgroundColor: '#15aa9b',
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
    borderBottomColor: '#15aa9b',
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#15aa9b',
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
    backgroundColor: '#15aa9b',
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
    backgroundColor: '#15aa9b',
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 8,
  },
  venueImage: {
    width: 75,
    height: 75,
    borderRadius: 12,
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
    color: '#15aa9b',
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 8,
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
    marginRight: 12,
  },
  swipeContainer: {
    flex: 1,
  },
  priceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 4,
  },
});
