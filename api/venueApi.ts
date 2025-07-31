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
        // Parse images from the new format
        let facilityImages = [];
        try {
          if (facility.images) {
            const parsedImages = JSON.parse(facility.images);
            facilityImages = parsedImages.map((img: string) => 
              `https://admin.bookvenue.app/${img.replace(/\\/g, '/')}`
            );
          }
        } catch (e) {
          console.warn('Failed to parse facility images:', e);
        }
        
        // Add featured image if available
        if (facility.featured_image) {
          facilityImages.unshift(`https://admin.bookvenue.app/${facility.featured_image}`);
        }
        
        // Fallback image if no images available
        if (facilityImages.length === 0) {
          facilityImages = ['https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'];
        }

        // Get the first service and court for pricing
        const firstService = facility.services?.[0];
        const firstCourt = firstService?.courts?.[0];
        
        // Calculate average rating
        const avgRating = facility.avg_rating || 4.5;

        return {
          id: facility.id.toString(),
          slug: facility.slug || facility.id.toString(),
          name: facility.official_name,
          description: facility.description || '',
          location: facility.address,
          type: firstService?.name || 'Sports',
          pricePerHour: parseFloat(firstCourt?.day_slot_price || firstCourt?.night_slot_price || '100'),
          openingTime: firstCourt?.day_start_time || '06:00',
          closingTime: firstCourt?.night_end_time || '23:00',
          rating: avgRating,
          amenities: ['Parking', 'Changing Rooms', 'Lighting'],
          images: facilityImages,
          coordinates: {
            latitude: parseFloat(facility.lat || '0'),
            longitude: parseFloat(facility.lng || '0')
          },
          services: facility.services?.map((service: any) => ({
            ...service,
            courts: service.courts?.map((court: any) => ({
              ...court,
              start_time: court.day_start_time,
              end_time: court.night_end_time,
              slot_price: court.day_slot_price,
              night_start_time: court.night_start_time,
              night_end_time: court.night_end_time,
              night_slot_price: court.night_slot_price
            })) || []
          })) || []
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

      // Parse facility images
      let facilityImages = [];
      try {
        if (facility.images) {
          const parsedImages = JSON.parse(facility.images);
          facilityImages = parsedImages.map((img: string) => 
            `https://admin.bookvenue.app/${img.replace(/\\/g, '/')}`
          );
        }
      } catch (e) {
        console.warn('Failed to parse facility images:', e);
      }
      
      // Add featured image if available
      if (facility.featured_image) {
        facilityImages.unshift(`https://admin.bookvenue.app/${facility.featured_image}`);
      }
      
      // Fallback image if no images available
      if (facilityImages.length === 0) {
        facilityImages = ['https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'];
      }

      // Process services with proper court data
      const processedServices = facility.services?.map((service: any) => ({
        ...service,
        courts: service.courts?.map((court: any) => ({
          ...court,
          start_time: court.day_start_time,
          end_time: court.night_end_time,
          slot_price: court.day_slot_price,
          night_start_time: court.night_start_time,
          night_end_time: court.night_end_time,
          night_slot_price: court.night_slot_price
        })) || []
      })) || [];
      
      const firstService = processedServices[0];
      const firstCourt = firstService?.courts?.[0];
      
      // Calculate average rating
      const avgRating = facility.avg_rating || 4.5;

      const venueData = {
        id: facility.id.toString(),
        slug: facility.slug,
        name: facility.official_name || 'Unknown Venue',
        description: facility.description || 'No description available',
        location: facility.address || 'Location not available',
        type: firstService?.name || 'Other',
        pricePerHour: parseFloat(firstCourt?.day_slot_price || firstCourt?.night_slot_price || '0'),
        openingTime: firstCourt?.day_start_time || '06:00',
        closingTime: firstCourt?.night_end_time || '23:00',
        rating: avgRating,
        amenities: ['Parking', 'Changing Rooms', 'Lighting'],
        images: facilityImages,
        coordinates: {
          latitude: parseFloat(facility.lat || '0'),
          longitude: parseFloat(facility.lng || '0')
        },
        services: processedServices
      };

      console.log('Venue fetched successfully:', venueData);
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