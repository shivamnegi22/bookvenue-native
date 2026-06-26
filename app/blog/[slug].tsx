import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Share2, ExternalLink } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { blogApi, Blog } from '@/api/blogApi';

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all blogs and find the one with matching slug
        const blogs = await blogApi.getBlogs();
        const foundBlog = blogs.find((b) => b.slug === slug);

        if (foundBlog) {
          setBlog(foundBlog);
        } else {
          setError(t('blogNotFound'));
        }
      } catch (err) {
        console.error('Error fetching blog:', err);
        setError(t('failedLoadBlog'));
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Convert HTML to a more readable format
  const formatHtmlContent = (html: string) => {
    // Remove unwanted tags and convert to plain text with line breaks
    let formatted = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p>/gi, '')
      .replace(/<h[1-6]>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<strong>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<a[^>]*>/gi, '')
      .replace(/<\/a>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return formatted;
  };

  const handleShare = async () => {
    if (!blog) return;

    const url = `https://bookvenue.app/blog/${blog.slug}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert(t('share'), t('shareBlogMessage'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error || !blog) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t('blogNotFound')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('latestBlogs')}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Share2 size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: blog.featured_image }} style={styles.featuredImage} />

        <View style={styles.contentContainer}>
          <Text style={styles.blogTitle}>{blog.title}</Text>

          <View style={styles.dateContainer}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(blog.created_at)}</Text>
          </View>

          <View style={styles.separator} />

          <Text style={styles.blogContent}>
            {formatHtmlContent(blog.description)}
          </Text>

          <View style={styles.footerContainer}>
            <View style={styles.separator} />
            <Text style={styles.footerText}>
              {t('thankYouReading')} {' '}
              <Text style={styles.linkText} onPress={() => Linking.openURL('https://bookvenue.app')}>
                bookvenue.app
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  featuredImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  blogTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 32,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  blogContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26,
  },
  footerContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  linkText: {
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
});
