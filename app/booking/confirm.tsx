import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { venueApi } from '@/api/venueApi';
import { bookingApi } from '@/api/bookingApi';
import { Venue } from '@/types/venue';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, MapPin, Calendar, Clock, IndianRupee, CreditCard, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { RazorpayService } from '@/utils/razorpay';

export default function BookingConfirmScreen() {
  const {
    venueId,
    facility_id,
    serviceId,
    courtId,
    date,
    bookingSlots,
    price,
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
    price: string;
    courtName: string;
    serviceName: string;
    totalSlots: string;
  }>();

  const router = useRouter();
  const { user } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots = bookingSlots ? JSON.parse(bookingSlots) : [];
  const numberOfSlots = parseInt(totalSlots || '1');

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        if (!venueId) return;
        const response = await venueApi.getVenueBySlug(venueId);
        setVenue(response);
      } catch (error) {
        console.error('Error fetching venue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [venueId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const calculateTotalAmount = () => {
    if (!price) return 0;
    return parseFloat(price) * numberOfSlots;
  };

  const totalAmount = calculateTotalAmount();

  const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    try {
      setPaymentLoading(true);
      setError(null);

      console.log('Payment successful, creating bookings...', { paymentId, orderId });

      // Create booking with new payload format
      const bookingData = {
        facility_id: parseInt(facility_id),
        court_id: parseInt(courtId),
        date: date,
        duration: 60,
        slot_count: numberOfSlots,
        total_price: totalAmount,
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
        address: user?.address || '',
        selected_slots: slots.map((slot: any) => ({
          start_time: slot.startTime,
          end_time: slot.endTime,
          price: price
        })),
        payment_id: paymentId,
        order_id: orderId,
      };

      console.log('Creating booking with new format:', bookingData);
      await bookingApi.createBooking(bookingData);

      // Update payment status as successful
      await bookingApi.paymentSuccess({
        order_id: orderId,
        payment_id: paymentId,
        status: 'success'
      });

      setBookingConfirmed(true);

      // Navigate to bookings screen after 2 seconds
      setTimeout(() => {
        router.replace('/(tabs)/bookings');
      }, 2000);

    } catch (error: any) {
      console.error('Booking creation error:', error);
      setError(error.message || 'Booking failed. Please contact support.');
      
      // Mark payment as failed
      try {
        await bookingApi.paymentFailure({
          order_id: orderId,
          status: 'failed',
          error: error.message
        });
      } catch (failureError) {
        console.error('Failed to mark payment as failed:', failureError);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentFailure = async (orderId: string, error: any) => {
    try {
      console.log('Payment failed:', error);
      await bookingApi.paymentFailure({
        order_id: orderId,
        status: 'failed',
        error: error.message || 'Payment failed'
      });
      setError('Payment failed. Please try again.');
    } catch (failureError: any) {
      console.error('Payment failure update error:', failureError);
      setError('Payment failed. Please try again or contact support.');
    }
  };

  const handlePayment = async () => {
    try {
      setPaymentLoading(true);
      setError(null);

      if (!user) {
        throw new Error('User not logged in');
      }

      if (!user.phone || user.phone.length < 10) {
        throw new Error('Please update your phone number in profile to proceed with payment');
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Initiating payment with Razorpay...', {
        amount: totalAmount,
        orderId,
        user: user.name,
        venue: venue?.name
      });

      const paymentOptions = RazorpayService.createPaymentOptions(
        totalAmount,
        orderId,
        {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        {
          venueName: venue?.name || 'Unknown Venue',
          courtName: courtName || 'Court',
          date: date || '',
          slots: numberOfSlots
        }
      );

      const response = await RazorpayService.openCheckout(paymentOptions);
      console.log('Payment response received:', response);
      
      await handlePaymentSuccess(response.razorpay_payment_id, orderId);

    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.message === 'Payment cancelled by user') {
        setError('Payment was cancelled');
      } else if (error.message.includes('phone number')) {
        setError(error.message);
      } else {
        setError(error.message || 'Payment failed. Please try again.');
        
        // Handle payment failure
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await handlePaymentFailure(orderId, error);
      }
      
      setPaymentLoading(false);
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

  if (bookingConfirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <CheckCircle2 size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successText}>
            Your {numberOfSlots > 1 ? `${numberOfSlots} bookings have` : 'booking has'} been successfully confirmed. 
            Payment of ₹{totalAmountFromParams} has been processed.
          </Text>
          <Text style={styles.successSubtext}>
            You can view your booking details in the Bookings tab.
          </Text>
          <View style={styles.successDetails}>
            <Text style={styles.successDetailText}>Venue: {venue.name}</Text>
            <Text style={styles.successDetailText}>Court: {courtName}</Text>
            <Text style={styles.successDetailText}>Date: {formatDate(date || '')}</Text>
            <Text style={styles.successDetailText}>
              {numberOfSlots > 1 ? `${numberOfSlots} time slots` : `${slots[0]?.startTime} - ${slots[0]?.endTime}`}
            </Text>
          </View>
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
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bookingDetailsContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.venueInfoContainer}>
            <Image
              source={{ uri: venue.images[0] }}
              style={styles.venueImage}
            />
            <View style={styles.venueInfo}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.locationContainer}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
              </View>
              <Text style={styles.serviceInfo}>{serviceName} - {courtName}</Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Calendar size={20} color="#2563EB" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(date || '')}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Clock size={20} color="#2563EB" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Time Slots</Text>
                <Text style={styles.detailValue}>
                  {numberOfSlots > 1
                    ? `${numberOfSlots} slots selected`
                    : `${slots[0]?.startTime} - ${slots[0]?.endTime}`
                  }
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <IndianRupee size={20} color="#2563EB" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Price per slot</Text>
                <Text style={styles.detailValue}>₹{price}</Text>
              </View>
            </View>
          </View>

          {numberOfSlots > 1 && (
            <View style={styles.slotsContainer}>
              <Text style={styles.slotsTitle}>Selected Time Slots:</Text>
              {slots.map((slot: any, index: number) => (
                <View key={index} style={styles.slotItem}>
                  <Text style={styles.slotText}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                  <Text style={styles.slotPrice}>₹{price}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.paymentSummaryContainer}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>
              {numberOfSlots > 1 ? `Venue charges (${numberOfSlots} slots)` : 'Venue charges'}
            </Text>
            <Text style={styles.summaryItemValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Platform fee</Text>
            <Text style={styles.summaryItemValue}>₹0.00</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Taxes & fees</Text>
            <Text style={styles.summaryItemValue}>₹0.00</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.paymentMethodContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity style={styles.paymentMethodItem}>
            <CreditCard size={20} color="#2563EB" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodText}>Razorpay</Text>
              <Text style={styles.paymentMethodSubtext}>UPI, Cards, Wallets & More</Text>
            </View>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorMessageContainer}>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 Your payment is secured by Razorpay with 256-bit SSL encryption
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.totalContainer}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.payButton, paymentLoading && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>Pay Now</Text>
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  successSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  successDetailText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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
  placeholder: {
    width: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // Extra padding for fixed footer
  },
  bookingDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  venueInfoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  venueImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  venueInfo: {
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
    marginLeft: 6,
  },
  serviceInfo: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTextContainer: {
    marginLeft: 12,
  },
  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
  },
  slotsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  slotsTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginBottom: 8,
  },
  slotText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#1F2937',
  },
  slotPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563EB',
  },
  paymentSummaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItemLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
  },
  summaryItemValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#1F2937',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
  },
  paymentMethodContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  paymentMethodInfo: {
    marginLeft: 12,
  },
  paymentMethodText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
  },
  paymentMethodSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  errorMessageContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorMessage: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#EF4444',
  },
  securityNote: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  securityText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for home indicator on iOS
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
    fontSize: 20,
    color: '#1F2937',
  },
  payButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  payButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});