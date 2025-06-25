import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Venue } from '@/types/venue';
import { MapPin, Star, IndianRupee } from 'lucide-react-native';

type VenueCardProps = {
  venue: Venue;
  size: 'small' | 'large';
};

export default function VenueCard({ venue, size }: VenueCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push({
      pathname: '/venue/[id]',
      params: { id: venue.slug }
    });
  };
  
  // Get the current price based on selected service/court or default
  const getCurrentPrice = () => {
    if (venue.services && venue.services.length > 0) {
      const firstService = venue.services[0];
      if (firstService.courts && firstService.courts.length > 0) {
        return parseFloat(firstService.courts[0].slot_price);
      }
    }
    return venue.pricePerHour;
  };
  
  if (size === 'large') {
    return (
      <TouchableOpacity 
        style={styles.largeCardContainer}
        onPress={handlePress}
      >
        <View style={styles.largeImageContainer}>
          <Image source={{ uri: venue.images[0] }} style={styles.largeImage} />
          <View style={styles.ratingContainer}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.largeCardContent}>
          <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.locationContainer}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₹{getCurrentPrice()}/hour</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={handlePress}
    >
      <Image source={{ uri: venue.images[0] }} style={styles.image} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.locationContainer}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.venueTypeContainer}>
            <Text style={styles.venueTypeText}>{venue.type}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₹{getCurrentPrice()}/hour</Text>
          </View>
        </View>
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  venueName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueTypeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  venueTypeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#4B5563',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
  },
  largeCardContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  largeImageContainer: {
    position: 'relative',
  },
  largeImage: {
    width: '100%',
    height: 140,
  },
  largeCardContent: {
    padding: 12,
  },
});