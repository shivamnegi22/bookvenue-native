import axios from 'axios';
import { Venue } from '@/types/venue';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://admin.bookvenue.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const venueApi = {
  getVenues: async () => {
    try {
      const response = await api.get('/get-all-facility');
      const data = response.data.facility;

      const venues: Venue[] = data.map((facility: any) => {
        const service = facility.services?.[0];
        const court = service?.courts?.[0];

        const images = service?.images
          ? JSON.parse(service.images).map((img: string) => `https://admin.bookvenue.app/${img.replace(/\\/g, '/')}`)
          : [];

        return {
          id: facility.id.toString(),
          slug: facility.slug || facility.id.toString(),
          name: facility.official_name,
          description: facility.description || '',
          location: facility.address,
          type: service?.name || 'Other',
          pricePerHour: parseFloat(court?.slot_price || '100'),
          openingTime: court?.start_time || '09:00',
          closingTime: court?.end_time || '22:00',
          rating: 4.5,
          amenities: ['Parking', 'Changing Rooms', 'Lighting'],
          images: images.length > 0 ? images : [
            'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
          ],
          coordinates: {
            latitude: parseFloat(facility.lat || '0'),
            longitude: parseFloat(facility.lng || '0')
          },
          services: facility.services || []
        };
      });
      
      return venues;
    } catch (error) {
      console.error('Failed to fetch venues:', error);
      return [];
    }
  },
  
  getVenueBySlug: async (slug: string) => {
    try {
      const response = await api.get(`/get-facility-by-slug/${slug}`);
      const facility = response.data.facility;

      // Process services with proper image URLs and fix courts array
      const processedServices = facility.services?.map((service: any) => ({
        ...service,
        courts: service.courts || service.court || [] // Handle both 'courts' and 'court' properties
      })) || [];

      // Get images from the first service or use default
      const firstService = processedServices[0];
      const images = firstService?.images
        ? JSON.parse(firstService.images).map((img: string) => `https://admin.bookvenue.app/${img.replace(/\\/g, '/')}`)
        : [];

      const venueData = {
        id: facility.id.toString(),
        slug: facility.slug,
        name: facility.official_name,
        description: facility.description || 'No description available',
        location: facility.address,
        type: firstService?.name || 'Other',
        pricePerHour: parseFloat(firstService?.courts?.[0]?.slot_price || '0'),
        openingTime: firstService?.courts?.[0]?.start_time || '09:00',
        closingTime: firstService?.courts?.[0]?.end_time || '22:00',
        rating: 4.5,
        amenities: ['Parking', 'Changing Rooms', 'Lighting'],
        images: images.length > 0 ? images : [
          'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
        ],
        coordinates: {
          latitude: parseFloat(facility.lat || '0'),
          longitude: parseFloat(facility.lng || '0')
        },
        services: processedServices
      };

      // console.log('Venue fetched successfully:', venueData);
      return venueData;
    } catch (error) {
      console.error('Error fetching venue by slug:', error);
      throw new Error('Venue not found');
    }
  },
  createVenue: async (venueData: any) => {
    try {
      const response = await api.post('/create-facility', venueData);
      return response.data;
    } catch (error) {
      console.error('Error creating venue:', error);
      throw new Error('Failed to create venue');
    }
  }

};