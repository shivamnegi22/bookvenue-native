import axios from 'axios';

const API_URL = 'https://admin.bookvenue.app/api';

export type Blog = {
  id: number;
  title: string;
  slug: string;
  featured_image: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export const blogApi = {
  getBlogs: async (): Promise<Blog[]> => {
    try {
      console.log('Fetching blogs...');
      const response = await axios.get(`${API_URL}/get-all-blogs`);
      console.log('Blogs response:', response.data);

      if (!response.data || !response.data.blogs) {
        console.warn('No blogs in response');
        return [];
      }

      const blogs = response.data.blogs;

      // Map and process blog data
      return blogs.map((blog: any) => {
        // Process featured image URL
        const imageUrl = blog.featured_image
          ? `https://admin.bookvenue.app/${blog.featured_image.replace(/\\/g, '/')}`
          : 'https://images.pexels.com/photos/1263426/pexels-photo-1263426.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

        return {
          id: blog.id,
          title: blog.title,
          slug: blog.slug,
          featured_image: imageUrl,
          description: blog.description,
          created_at: blog.created_at,
          updated_at: blog.updated_at,
        };
      });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      return [];
    }
  },
};
