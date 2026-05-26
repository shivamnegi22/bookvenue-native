import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Blog } from '@/types/blog';
import { Calendar } from 'lucide-react-native';

type BlogCardProps = {
  blog: Blog;
  size?: 'small' | 'large';
};

export default function BlogCard({ blog, size = 'small' }: BlogCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/blog/[slug]',
      params: { slug: blog.slug },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Strip HTML tags from description for preview
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  const previewDescription = stripHtml(blog.description).substring(0, 100) + '...';

  if (size === 'large') {
    return (
      <TouchableOpacity style={styles.largeCardContainer} onPress={handlePress}>
        <Image source={{ uri: blog.featured_image }} style={styles.largeImage} />
        <View style={styles.largeCardContent}>
          <Text style={styles.blogTitle} numberOfLines={2}>
            {blog.title}
          </Text>
          <View style={styles.dateContainer}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(blog.created_at)}</Text>
          </View>
          <Text style={styles.blogDescription} numberOfLines={3}>
            {previewDescription}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress}>
      <Image source={{ uri: blog.featured_image }} style={styles.image} />
      <View style={styles.cardContent}>
        <Text style={styles.blogTitle} numberOfLines={2}>
          {blog.title}
        </Text>
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#6B7280" />
          <Text style={styles.dateText}>{formatDate(blog.created_at)}</Text>
        </View>
        <Text style={styles.blogDescriptionSmall} numberOfLines={2}>
          {previewDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  blogTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  blogDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  blogDescriptionSmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  largeCardContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  largeImage: {
    width: '100%',
    height: 120,
  },
  largeCardContent: {
    padding: 12,
  },
});
