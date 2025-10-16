export type Venue = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  type: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
  rating: number;
  totalReviews?: number;
  amenities: VenueAmenity[];
  images: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  services?: VenueService[];
  category?: string[];
  minimumAmount?: number;
  duration?: string;
};

export type VenueAmenity = {
  id: number;
  name: string;
  icon: string;
  description?: string;
};

export type VenueService = {
  id: number;
  facility_id: number;
  service_id: number;
  name: string;
  icon?: string;
  courts: VenueCourt[];
};

export type VenueCourt = {
  id: number;
  facility_service_id: number;
  court_name: string;
  day_start_time: string;
  day_end_time: string;
  day_slot_price: string;
  night_start_time: string;
  night_end_time: string;
  night_slot_price: string;
  start_time?: string;
  end_time?: string;
  slot_price?: string;
  duration: string;
  breaks: string;
};