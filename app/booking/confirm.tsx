import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, User, CreditCard, ArrowLeft, IndianRupee } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { bookingApi } from '@/api/bookingApi';
import { RazorpayService } from '@/utils/razorpay';

export default function ConfirmBooking() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  // useEffect(() => {
  //   console.log('Confirm booking params:', params);
    
  //   // Parse booking data from params
  //   const data = {
  //     venueId: params.venueId as string,
  //     venueName: params.venueName as string || 'Unknown Venue',
  //     facility_id: params.facility_id as string,
  //     serviceId: params.serviceId as string,
  //     courtId: params.courtId as string,
  //     courtName: params.courtName as string || 'Court',
  //     serviceName: params.serviceName as string || 'Service',
  //     date: params.date as string,
  //     totalAmount: parseFloat(params.totalAmount as string || '0'),
  //     totalSlots: parseInt(params.totalSlots as string || '1'),
  //     bookingSlots: params.bookingSlots ? JSON.parse(params.bookingSlots as string) : []
  //   };
    
  //   console.log('Parsed booking data:', data);
  //   setBookingData(data);
  // }, [params]);
useEffect(() => {
  if (!params) return;

  const data = {
    venueId: params.venueId as string,
    venueName: (params.venueName as string) || 'Unknown Venue',
    facility_id: params.facility_id as string,
    serviceId: params.serviceId as string,
    courtId: params.courtId as string,
    courtName: (params.courtName as string) || 'Court',
    serviceName: (params.serviceName as string) || 'Service',
    date: params.date as string,
    totalAmount: parseFloat((params.totalAmount as string) || '0'),
    totalSlots: parseInt((params.totalSlots as string) || '1'),
    bookingSlots: params.bookingSlots ? JSON.parse(params.bookingSlots as string) : []
  };

  setBookingData(data);
}, [
  params.venueId,
  params.venueName,
  params.facility_id,
  params.serviceId,
  params.courtId,
  params.courtName,
  params.serviceName,
  params.date,
  params.totalAmount,
  params.totalSlots,
  params.bookingSlots,
]);

  const handlePayment = async () => {
    if (!bookingData || !user) {
      Alert.alert('Error', 'Please login to complete booking');
      router.push('/(auth)/login');
      return;
    }

    setLoading(true);
    try {
      // Prepare booking payload for API
      const selectedSlots = bookingData.bookingSlots.map((slot: any) => ({
        start_time: slot.startTime,
        end_time: slot.endTime,
        price: Math.round(bookingData.totalAmount / bookingData.totalSlots).toString()
      }));

      const bookingPayload = {
        facility_id: parseInt(bookingData.facility_id),
        court_id: parseInt(bookingData.courtId),
        date: bookingData.date,
        duration: 60, // Default duration
        slot_count: bookingData.totalSlots,
        total_price: Math.round(bookingData.totalAmount),
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || '',
        address: user.address || '',
        selected_slots: selectedSlots,
      };

      console.log('Creating booking with payload:', bookingPayload);
      const orderResponse = await bookingApi.createBooking(bookingPayload);
      
      if (!orderResponse.order) {
        throw new Error('Failed to create order');
      }

      // Create Razorpay payment options
      const paymentOptions = RazorpayService.createPaymentOptions(
        bookingData.totalAmount,
        orderResponse.order.id,
        {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        {
          venueName: bookingData.venueName,
          courtName: bookingData.courtName,
          date: bookingData.date,
          slots: bookingData.totalSlots
        }
      );

      console.log('Opening Razorpay with options:', paymentOptions);
      const paymentResult = await RazorpayService.openCheckout(paymentOptions);
      
      // Payment successful - update status
      await bookingApi.paymentSuccess({
        order_id: orderResponse.order.id,
        payment_id: paymentResult.razorpay_payment_id,
        signature: paymentResult.razorpay_signature,
      });

      router.replace('/(tabs)/bookings');
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.message.includes('cancelled')) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!bookingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.confirmHeader}>
          <Text style={styles.confirmTitle}>Confirm Your Booking</Text>
          <Text style={styles.confirmSubtitle}>Review your booking details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Venue Details</Text>
          </View>
          <Text style={styles.venueName}>{bookingData.venueName}</Text>
          <Text style={styles.courtName}>{bookingData.serviceName} - {bookingData.courtName}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Date & Time</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(bookingData.date)}</Text>
          <View style={styles.slotsContainer}>
            {bookingData.bookingSlots.map((slot: any, index: number) => (
              <View key={index} style={styles.slotItem}>
                <View style={styles.slotTime}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.slotTimeText}>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </Text>
                </View>
                <Text style={styles.slotPrice}>
                  ₹{Math.round(bookingData.totalAmount / bookingData.totalSlots)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Booking Details</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration per slot:</Text>
            <Text style={styles.detailValue}>60 minutes</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Number of Slots:</Text>
            <Text style={styles.detailValue}>{bookingData.totalSlots}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>
          <View style={styles.priceBreakdown}>
            {bookingData.bookingSlots.map((slot: any, index: number) => (
              <View key={index} style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </Text>
                <Text style={styles.priceValue}>
                  ₹{Math.round(bookingData.totalAmount / bookingData.totalSlots)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <View style={styles.totalValueContainer}>
                <IndianRupee size={18} color="#059669" />
                <Text style={styles.totalValue}>₹{bookingData.totalAmount}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CreditCard size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay ₹{bookingData.totalAmount}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By proceeding, you agree to our terms and conditions
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  scrollContainer: {
    flex: 1,
  },
  confirmHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
  },
  confirmSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  venueName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  courtName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  slotsContainer: {
    gap: 12,
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotTimeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 8,
  },
  slotPrice: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  priceBreakdown: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});