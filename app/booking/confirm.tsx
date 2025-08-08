import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, IndianRupee, CreditCard, CircleCheck as CheckCircle } from 'lucide-react-native';
import { venueApi } from '@/api/venueApi';
import { bookingApi } from '@/api/bookingApi';
import { authApi } from '@/api/authApi';
import { Venue } from '@/types/venue';
import { useAuth } from '@/contexts/AuthContext';
import { initializeRazorpay, createRazorpayOrder, handlePayment } from '@/utils/razorpay';

interface BookingSlot {
  startTime: string;
  endTime: string;
  price: string;
}

export default function ConfirmBookingScreen() {
  const { 
    venueId, 
    facility_id,
    serviceId, 
    courtId, 
    date, 
    bookingSlots, 
    totalAmount,
    courtName,
    serviceName,
    totalSlots
  } = useLocalSearchParams<{
    venueId: string;
    facility_id: string;
    serviceId: string;
    courtId: string;
    date: string;
    bookingSlots: string;
    totalAmount: string;
    courtName: string;
    serviceName: string;
    totalSlots: string;
  }>();
  
  const router = useRouter();
  const { user } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const slots: BookingSlot[] = bookingSlots ? JSON.parse(bookingSlots) : [];
  const amount = parseFloat(totalAmount || '0');
  const slotCount = parseInt(totalSlots || '1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (venueId) {
          const venueResponse = await venueApi.getVenueBySlug(venueId);
          setVenue(venueResponse);
        }
        
        if (user) {
          const profileResponse = await authApi.getUserDetails();
          setUserProfile(profileResponse);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [venueId, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handlePaymentAndBooking = async () => {
    if (!user || !userProfile || !venue) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    setBookingLoading(true);

    try {
      // Initialize Razorpay
      await initializeRazorpay();

      // Create Razorpay order
      const orderData = await createRazorpayOrder(amount, 'INR', `Booking for ${venue.name}`);
      
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Handle payment
      const paymentResult = await handlePayment({
        orderId: orderData.order.id,
        amount: amount,
        currency: 'INR',
        name: venue.name,
        description: `Booking for ${courtName} on ${formatDate(date)}`,
        prefill: {
          name: userProfile.name || user.name || '',
          email: userProfile.email || user.email || '',
          contact: userProfile.contact || user.contact || ''
        }
      });

      if (paymentResult.success) {
        // Payment successful, now create booking
        const bookingPayload = {
          facility_id: parseInt(facility_id),
          court_id: parseInt(courtId),
          date: date,
          duration: 60,
          slot_count: slotCount,
          total_price: amount,
          name: userProfile.name || user.name || '',
          email: userProfile.email || user.email || '',
          contact: userProfile.contact || user.contact || '',
          address: userProfile.address || '',
          payment_id: paymentResult.paymentId,
          order_id: orderData.order.id,
          selected_slots: slots.map(slot => ({
            start_time: slot.startTime,
            end_time: slot.endTime,
            price: slot.price
          }))
        };

        console.log('Creating booking with payload:', bookingPayload);

        // Create booking
        const bookingResponse = await bookingApi.createBooking(bookingPayload);
        
        if (bookingResponse.success) {
          // Call payment success API
          await bookingApi.paymentSuccess({
            payment_id: paymentResult.paymentId,
            order_id: orderData.order.id,
            booking_id: bookingResponse.booking_id
          });

          Alert.alert(
            'Booking Confirmed!', 
            'Your booking has been confirmed successfully.',
            [
              {
                text: 'View Bookings',
                onPress: () => {
                  router.replace('/(tabs)/bookings');
                }
              }
            ]
          );
        } else {
          throw new Error(bookingResponse.message || 'Failed to create booking');
        }
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert(
        'Booking Failed', 
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => setBookingLoading(false)
          }
        ]
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Venue not found</Text>
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

  // Check if all slots have the same price
  const uniquePrices = [...new Set(slots.map(slot => slot.price))];
  const hasVariablePricing = uniquePrices.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.venueCard}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <View style={styles.venueLocation}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>{venue.location}</Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color="#2563EB" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={20} color="#2563EB" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time Slots ({slotCount})</Text>
              {slots.map((slot, index) => (
                <View key={index} style={styles.timeSlotRow}>
                  <Text style={styles.detailValue}>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </Text>
                  <Text style={styles.slotPrice}>₹{slot.price}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Court</Text>
              <Text style={styles.detailValue}>{courtName} - {serviceName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
          
          {slots.map((slot, index) => (
            <View key={index} style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </Text>
              <Text style={styles.priceValue}>₹{slot.price}</Text>
            </View>
          ))}
          
          <View style={styles.separator} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{amount}</Text>
          </View>
        </View>

        {userProfile && (
          <View style={styles.customerDetails}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Name</Text>
              <Text style={styles.customerValue}>{userProfile.name}</Text>
            </View>
            
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Email</Text>
              <Text style={styles.customerValue}>{userProfile.email}</Text>
            </View>
            
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Contact</Text>
              <Text style={styles.customerValue}>{userProfile.contact}</Text>
            </View>
            
            {userProfile.address && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Address</Text>
                <Text style={styles.customerValue}>{userProfile.address}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.totalContainer}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>₹{amount}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.confirmButton, bookingLoading && styles.confirmButtonDisabled]}
            onPress={handlePaymentAndBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CreditCard size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Pay & Book</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  venueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  venueName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 8,
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  bookingDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
  },
  timeSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563EB',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1F2937',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#2563EB',
  },
  customerDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  customerValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  totalContainer: {
    flex: 1,
  },
  footerTotalLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  footerTotalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    marginLeft: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  confirmButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});