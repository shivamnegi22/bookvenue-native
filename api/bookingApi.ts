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
  getBookings: async (): Promise<Booking[]> => {
    try {
      console.log('Fetching bookings...');
      const response = await api.get('/my-bookings');
      console.log('Raw booking response:', response.data);

      if (!response.data) {
        console.warn('No data in response');
        return [];
      }

      // Handle different possible response structures
      let bookingsData = [];
      if (response.data.bookings) {
        bookingsData = Array.isArray(response.data.bookings) ? response.data.bookings : [];
      } else if (response.data.data) {
        bookingsData = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        bookingsData = response.data;
      }

      console.log('Processing bookings data:', bookingsData);
      
      return bookingsData.map((booking: any, index: number) => {
        // Handle different possible data structures
        const facilityName = booking.facility_name || booking.facility?.official_name || booking.venue_name || 'Unknown Venue';
        const courtName = booking.court_name || booking.court?.court_name || booking.court_type || 'Court';
        const bookingDate = booking.date || booking.booking_date;
        const totalPrice = parseFloat(booking.total_price || booking.price || booking.amount || '0');
        const bookingStatus = (booking.status || 'pending').toLowerCase();

        // Handle time slots - improved logic
        let startTime = '';
        let endTime = '';
        let slotsCount = 1;

        if (booking.slots && Array.isArray(booking.slots) && booking.slots.length > 0) {
          slotsCount = booking.slots.length;
          const startTimes = booking.slots.map((slot: any) => slot.start_time || slot.startTime).filter(Boolean);
          const endTimes = booking.slots.map((slot: any) => slot.end_time || slot.endTime).filter(Boolean);
          startTime = startTimes.join(', ');
          endTime = endTimes.join(', ');
        } else if (booking.start_time && booking.end_time) {
          startTime = booking.start_time;
          endTime = booking.end_time;
          slotsCount = 1;
        } else if (booking.time_slot) {
          startTime = booking.time_slot;
          endTime = booking.time_slot;
          slotsCount = 1;
        }

        // Handle venue image
        let venueImage = 'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
        if (booking.venue_image) {
          venueImage = booking.venue_image;
        } else if (booking.facility?.featured_image) {
          venueImage = `https://admin.bookvenue.app/${booking.facility.featured_image.replace(/\\/g, '/')}`;
        }

        const processedBooking = {
          id: booking.id?.toString() || index.toString(),
          venue: {
            id: booking.facility_id?.toString() || 'venue-1',
            name: facilityName,
            location: booking.venue_location || booking.facility?.address || booking.address || 'Location not available',
            type: courtName,
            slug: booking.facility_slug || booking.facility?.slug || 'venue-1',
            images: [venueImage],
            coordinates: {
              latitude: parseFloat(booking.venue_lat || booking.facility?.lat || '28.6139'),
              longitude: parseFloat(booking.venue_lng || booking.facility?.lng || '77.2090')
            }
          },
          date: bookingDate,
          startTime: startTime,
          endTime: endTime,
          totalAmount: totalPrice,
          status: bookingStatus as 'pending' | 'confirmed' | 'cancelled',
          slots: slotsCount
        };

        console.log('Processed booking:', processedBooking);
        return processedBooking;
      });
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
    }
  },
  
  getBookingById: async (id: string): Promise<Booking> => {
    try {
      console.log('Fetching booking by ID:', id);
      const response = await api.get(`/booking/${id}`);
      const booking = response.data.booking || response.data;
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      console.log('Booking details:', booking);
      
      const venueImage = booking.venue_image || 
        (booking.facility?.featured_image ? 
        `https://admin.bookvenue.app/${booking.facility.featured_image.replace(/\\/g, '/')}` :
        'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
      
      return {
        id: booking.id?.toString() || id,
        venue: {
          id: booking.facility_id?.toString() || 'venue-1',
          name: booking.facility_name || booking.facility?.official_name || 'Unknown Venue',
          type: booking.court_name || booking.court?.court_name || 'Court',
          location: booking.venue_location || booking.facility?.address || 'Location not available',
          slug: booking.facility_slug || booking.facility?.slug || 'venue-1',
          images: [venueImage],
          coordinates: {
            latitude: parseFloat(booking.venue_lat || booking.facility?.lat || '28.6139'),
            longitude: parseFloat(booking.venue_lng || booking.facility?.lng || '77.2090')
          }
        },
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: parseFloat(booking.total_price || booking.price || '0'),
        status: (booking.status || 'pending').toLowerCase() as 'pending' | 'confirmed' | 'cancelled'
      };
    } catch (error: any) {
      console.error('Error fetching booking by ID:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch booking');
    }
  },

  // Get court availability - updated to use the correct API
  getCourtAvailability: async (facilityId: string, courtId: string, date: string) => {
    try {
      console.log('Fetching court availability:', { facilityId, courtId, date });
      const response = await api.get(`/court-availability/${facilityId}/${courtId}/${date}`);
      console.log('Court availability response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching court availability:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch availability');
    }
  },
  
  createBooking: async (bookingData: any) => {
    try {
      console.log('Creating booking with data:', bookingData);
      const response = await api.post('/booking', bookingData);
      console.log('Booking creation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Booking creation error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to create booking');
    }
  },

  createMultipleBookings: async (bookingsData: any[]) => {
    try {
      console.log('Creating multiple bookings:', bookingsData);
      const bookingPromises = bookingsData.map(bookingData => 
        api.post('/booking', bookingData)
      );
      const responses = await Promise.all(bookingPromises);
      console.log('Multiple bookings created successfully');
      return responses.map(response => response.data);
    } catch (error: any) {
      console.error('Multiple bookings creation error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to create bookings');
    }
  },

  cancelBooking: async (bookingId: string) => {
    try {
      console.log('Cancelling booking:', bookingId);
      const response = await api.post(`/cancel-booking/${bookingId}`);
      console.log('Booking cancelled successfully');
      return response.data;
    } catch (error: any) {
      console.error('Booking cancellation error:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel booking');
    }
  },

  paymentSuccess: async (paymentData: any) => {
    try {
      console.log('Updating payment success:', paymentData);
      const response = await api.post('/payment-success', paymentData);
      console.log('Payment success updated');
      return response.data;
    } catch (error: any) {
      console.error('Payment success update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  },

  paymentFailure: async (paymentData: any) => {
    try {
      console.log('Updating payment failure:', paymentData);
      const response = await api.get('/payment-failure', { params: paymentData });
      console.log('Payment failure updated');
      return response.data;
    } catch (error: any) {
      console.error('Payment failure update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  }
};