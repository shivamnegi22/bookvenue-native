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
  amenities: string[];
  images: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  services?: VenueService[];
};

export type VenueService = {
  id: number;
  facility_id: number;
  service_id: number;
  name: string;
  images: string;
  courts: VenueCourt[];
};

export type VenueCourt = {
  id: number;
  facility_service_id: number;
  court_name: string;
  start_time: string;
  end_time: string;
  slot_price: string;
  duration: string;
  breaks: string;
};