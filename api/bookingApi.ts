import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking } from '@/types/booking';

const API_URL = 'https://admin.bookvenue.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const bookingApi = {
getBookings: async () => {
  try {
    const response = await api.get('/my-bookings');

    if (!response.data.bookings || !Array.isArray(response.data.bookings)) {
      console.warn('No bookings found or invalid format');
      return [];
    }

    return response.data.bookings.map((booking: any, index: number) => {
      const slots = booking.slots || [];
      const firstSlot = slots.length > 0 ? slots[0] : null;

      return {
        id: `${index}`,
        name: booking.facility,
        court: booking.court,
        date: booking.date,
        startTime: booking.slots?.map((slot: any) => slot.start_time).join(', ') || '',
        endTime: booking.slots?.map((slot: any) => slot.end_time).join(', ') || '',
        totalAmount: parseFloat(booking.price || '0'),
        status: (booking.status || 'not sure').toLowerCase(),
        slots: booking.slots?.length || 0
      };

    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
  }
}

,
  
  getBookingById: async (id: string) => {
    try {
      const response = await api.get(`/booking/${id}`);
      const booking = response.data.booking;
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      const venueImage = booking.venue_image || 
        booking.facility?.featured_image ? 
        `https://admin.bookvenue.app/${booking.facility.featured_image.replace(/\\/g, '/')}` :
        'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
      
      return {
        id: booking.id?.toString() || id,
        venue: {
          id: booking.facility_id?.toString() || 'venue-1',
          name: booking.facility_name || booking.facility || 'Unknown Venue',
          type: booking.court_name || booking.court || 'Court',
          location: booking.venue_location || 'Location not available',
          slug: booking.facility_slug || 'venue-1',
          images: [venueImage],
          coordinates: {
            latitude: parseFloat(booking.venue_lat || '37.78825'),
            longitude: parseFloat(booking.venue_lng || '-122.4324')
          }
        },
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: parseFloat(booking.total_price || booking.price || '0'),
        status: (booking.status || 'pending').toLowerCase()
      };
    } catch (error: any) {
      console.error('Error fetching booking by ID:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch booking');
    }
  },
  
  createBooking: async (bookingData: any) => {
    try {
      // console.log('Creating booking with data:', bookingData);
      const response = await api.post('/booking', bookingData);
      return response.data;
    } catch (error: any) {
      console.error('Booking creation error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to create booking');
    }
  },

  createMultipleBookings: async (bookingsData: any[]) => {
    try {
      const bookingPromises = bookingsData.map(bookingData => 
        api.post('/booking', bookingData)
      );
      const responses = await Promise.all(bookingPromises);
      return responses.map(response => response.data);
    } catch (error: any) {
      console.error('Multiple bookings creation error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to create bookings');
    }
  },

  cancelBooking: async (bookingId: string) => {
    try {
      const response = await api.post(`/cancel-booking/${bookingId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel booking');
    }
  },

  paymentSuccess: async (orderId: string, paymentId: string) => {
    try {
      const response = await api.post('/booking/payment-success', {
        order_id: orderId,
        payment_id: paymentId
      });
      return response.data;
    } catch (error: any) {
      console.error('Payment success update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  },

  paymentFailure: async (orderId: string) => {
    try {
      const response = await api.post('/booking/payment-failure', {
        order_id: orderId
      });
      return response.data;
    } catch (error: any) {
      console.error('Payment failure update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  }
};