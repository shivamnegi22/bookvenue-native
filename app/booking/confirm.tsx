import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar, Clock, MapPin, User, CreditCard, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { createBooking, updatePaymentStatus } from '@/api/bookingApi';
import RazorpayCheckout from 'react-native-razorpay';

interface BookingData {
  venueId: string;
  venueName: string;
  courtId: string;
  courtName: string;
  date: string;
  selectedSlots: Array<{
    start_time: string;
    end_time: string;
    price: string;
  }>;
  totalAmount: string;
  duration: string;
  slotCount: string;
}

export default function ConfirmBooking() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    if (params.bookingData) {
      try {
        const data = JSON.parse(params.bookingData as string);
        setBookingData(data);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        Alert.alert('Error', 'Invalid booking data');
        router.back();
      }
    }
  }, [params.bookingData]);

  const handlePayment = async () => {
    if (!bookingData || !user) return;

    setLoading(true);
    try {
      // Create booking and get Razorpay order
      const bookingPayload = {
        facility_id: parseInt(bookingData.venueId),
        court_id: parseInt(bookingData.courtId),
        date: bookingData.date,
        duration: parseInt(bookingData.duration),
        slot_count: parseInt(bookingData.slotCount),
        total_price: parseInt(bookingData.totalAmount),
        name: user.name || '',
        email: user.email || '',
        contact: user.contact || '',
        address: user.address || '',
        selected_slots: bookingData.selectedSlots,
      };

      const orderResponse = await createBooking(bookingPayload);
      
      if (!orderResponse.order) {
        throw new Error('Failed to create order');
      }

      const options = {
        description: `Booking for ${bookingData.venueName}`,
        image: 'https://your-logo-url.com/logo.png',
        currency: 'INR',
        key: 'rzp_live_qyWsOEPEllNahd',
        amount: orderResponse.order.amount,
        order_id: orderResponse.order.id,
        name: 'BookVenue',
        prefill: {
          email: user.email,
          contact: user.contact,
          name: user.name,
        },
        theme: { color: '#3B82F6' },
      };

      const paymentResult = await RazorpayCheckout.open(options);
      
      // Payment successful
      await updatePaymentStatus({
        order_id: orderResponse.order.id,
        payment_id: paymentResult.razorpay_payment_id,
        signature: paymentResult.razorpay_signature,
      }, 'success');

      Alert.alert(
        'Success!',
        'Your booking has been confirmed successfully.',
        [
          {
            text: 'View Bookings',
            onPress: () => {
              setTimeout(() => {
                router.replace('/(tabs)/bookings');
              }, 100);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.code === 'payment_cancelled') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
        
        // Update payment status as failed if order was created
        try {
          const orderResponse = await createBooking(bookingPayload);
          if (orderResponse.order) {
            await updatePaymentStatus({
              order_id: orderResponse.order.id,
            }, 'failure');
          }
        } catch (updateError) {
          console.error('Error updating payment status:', updateError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!bookingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <CheckCircle size={48} color="#10B981" />
        <Text style={styles.headerTitle}>Confirm Your Booking</Text>
        <Text style={styles.headerSubtitle}>Review your booking details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MapPin size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Venue Details</Text>
        </View>
        <Text style={styles.venueName}>{bookingData.venueName}</Text>
        <Text style={styles.courtName}>{bookingData.courtName}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Calendar size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Date & Time</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(bookingData.date)}</Text>
        <View style={styles.slotsContainer}>
          {bookingData.selectedSlots.map((slot, index) => (
            <View key={index} style={styles.slotItem}>
              <View style={styles.slotTime}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.slotTimeText}>
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </Text>
              </View>
              <Text style={styles.slotPrice}>₹{slot.price}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <User size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Booking Details</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{bookingData.duration} minutes</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Number of Slots:</Text>
          <Text style={styles.detailValue}>{bookingData.slotCount}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <CreditCard size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Payment Summary</Text>
        </View>
        <View style={styles.priceBreakdown}>
          {bookingData.selectedSlots.map((slot, index) => (
            <View key={index} style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </Text>
              <Text style={styles.priceValue}>₹{slot.price}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{bookingData.totalAmount}</Text>
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
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
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  venueName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  courtName: {
    fontSize: 16,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
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
    color: '#374151',
    marginLeft: 8,
  },
  slotPrice: {
    fontSize: 16,
    fontWeight: '600',
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
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
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
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
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
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
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
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});