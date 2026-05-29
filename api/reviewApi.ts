import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Review } from '@/types/review';

const API_URL = 'https://admin.bookvenue.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const reviewApi = {
  createReview: async (payload: {
    facility_id: number;
    user_id: number;
    rating: number;
    message: string;
  }): Promise<Review> => {
    try {
      console.log('Creating review:', payload);
      const response = await api.post('/create-review', payload);
      console.log('Review created successfully:', response.data);
      return response.data.review || response.data;
    } catch (error: any) {
      console.error('Create review error:', error.response?.data || error);
      throw new Error(
        error.response?.data?.message || 'Failed to submit review',
      );
    }
  },

  getReviewsByFacilityId: async (
    facilityId: number | string,
  ): Promise<Review[]> => {
    try {
      console.log('Fetching reviews for facility:', facilityId);
      const response = await api.get(
        `/get-review-by-facility_id/${facilityId}`,
      );
      console.log('Reviews response:', response.data);

      const reviewsData =
        response.data.review || response.data.reviews || response.data.data || [];

      return reviewsData.map((review: any) => ({
        id: review.id,
        facility_id: review.facility_id,
        // backend can return user_id as null
        user_id: review.user_id ?? null,
        // backend rating can be string (e.g. "5")
        rating: Number(review.rating ?? 0),
        message:
          String(review.message ?? review.review ?? ''),
        user_name:
          review.user_name || review.name || review.user?.name || 'User',
        user_image:
          review.user_image || review.image || review.user?.image
            ? `https://admin.bookvenue.app/${review.user_image || review.image || review.user?.image}`
            : undefined,
        created_at: review.created_at,
        updated_at: review.updated_at,
      }));
    } catch (error: any) {
      console.error('Get reviews error:', error.response?.data || error);
      return [];
    }
  },
};
