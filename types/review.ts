export type Review = {
  id: number;
  facility_id: number;
  user_id: number;
  rating: number;
  message: string;
  user_name?: string;
  user_image?: string;
  created_at: string;
  updated_at?: string;
};
