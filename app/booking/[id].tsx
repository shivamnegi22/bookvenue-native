import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { bookingApi } from '@/api/bookingApi';
import { Booking } from '@/types/booking';
import { ArrowLeft, MapPin, Calendar, Clock, IndianRupee, CheckCircle2, XCircle, Share2 } from 'lucide-react-native';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) return;
        const response = await bookingApi.getBookingById(id);
        // Ensure venue.images is always an array
        setBooking({
          ...response,
          venue: {
            ...response.venue,
            images: Array.isArray(response.venue.images)
              ? response.venue.images
              : [response.venue.images],
          },
        });
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const isUpcoming = booking ? new Date(booking.date + 'T' + booking.startTime) > new Date() : false;
  
  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancelBooking,
        },
      ]
    );
  };
  
  const confirmCancelBooking = async () => {
    try {
      setCancelLoading(true);
      
      if (!booking) return;
      
      await bookingApi.cancelBooking(booking.id);
      
      // Update local state
      setBooking({
        ...booking,
        status: 'cancelled'
      });
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };
  
  const handleShareBooking = () => {
    // In a real app, this would use the Share API
    Alert.alert('Share', 'Sharing functionality would be implemented here');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButtonContainer}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity 
          style={styles.shareButtonContainer}
          onPress={handleShareBooking}
        >
          <Share2 size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusContainer}>
          {booking.status === 'confirmed' ? (
            <View style={styles.statusConfirmed}>
              <CheckCircle2 size={20} color="#10B981" />
              <Text style={styles.statusTextConfirmed}>Confirmed</Text>
            </View>
          ) : booking.status === 'pending' ? (
            <View style={styles.statusPending}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.statusTextPending}>Pending</Text>
            </View>
          ) : (
            <View style={styles.statusCancelled}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statusTextCancelled}>Cancelled</Text>
            </View>
          )}
          
          <Text style={styles.bookingIdText}>Booking ID: #{booking.id}</Text>
        </View>
        
        <View style={styles.venueDetailsContainer}>
          <Image 
            source={{ uri: booking.venue.images[0] }} 
            style={styles.venueImage}
          />
          
          <Text style={styles.venueName}>{booking.venue.name}</Text>
          
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>{booking.venue.location}</Text>
          </View>
          
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webMapFallback}>
                <Text style={styles.webMapText}>Map view is not available on web</Text>
              </View>
            ) : (
              (() => {
                const { default: MapView, Marker } = require('react-native-maps');
                
                return (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: booking.venue.coordinates.latitude,
                      longitude: booking.venue.coordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: booking.venue.coordinates.latitude,
                        longitude: booking.venue.coordinates.longitude
                      }}
                      title={booking.venue.name}
                    />
                  </MapView>
                );
              })()
            )}
          </View>
        </View>
        
        <View style={styles.bookingInfoContainer}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          
          <View style={styles.infoItem}>
            <Calendar size={20} color="#2563EB" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatDate(booking.date)}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Clock size={20} color="#2563EB" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{booking.startTime} - {booking.endTime}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <IndianRupee size={20} color="#2563EB" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValue}>${booking.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        
        {isUpcoming && booking.status === 'confirmed' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelBooking}
            disabled={cancelLoading}
          >
            {cancelLoading ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => {/* Contact venue owner */}}
        >
          <Text style={styles.contactButtonText}>Contact Venue Owner</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
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
  backButtonContainer: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  shareButtonContainer: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusTextConfirmed: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#10B981',
    marginLeft: 8,
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusTextPending: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 8,
  },
  statusCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusTextCancelled: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
  },
  bookingIdText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  venueDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  venueImage: {
    width: '100%',
    height: 200,
  },
  venueName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    margin: 16,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  mapContainer: {
    height: 150,
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  webMapText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  bookingInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#EF4444',
  },
  contactButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#2563EB',
  },
});