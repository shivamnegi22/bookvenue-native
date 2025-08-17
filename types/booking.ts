export type Booking = {
  id: string;
  venue: {
    id: string;
    name: string;
    location: string;
    type?: string;
    slug?: string;
    images: string[];
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  slots?: number;
};