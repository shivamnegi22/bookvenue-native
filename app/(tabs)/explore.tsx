import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, MapPin, X, FileSliders as Sliders, Calendar,  Star } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { venueApi } from '@/api/venueApi';
import { Venue } from '@/types/venue';
import VenueCard from '@/components/VenueCard';

export default function ExploreScreen() {
  const { query, filter } = useLocalSearchParams<{ query?: string; filter?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  const [selectedSportType, setSelectedSportType] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await venueApi.getVenues();
        setVenues(response);
        
        let filtered = [...response];
        
        if (filter === 'featured') {
          filtered = filtered.sort((a, b) => b.rating - a.rating).slice(0, 10);
        } else if (filter === 'nearby') {
          filtered = filtered.slice(0, 10);
        }
        
        if (query) {
          const lowercaseQuery = query.toLowerCase();
          filtered = filtered.filter(venue => 
            venue.name.toLowerCase().includes(lowercaseQuery) || 
            venue.location.toLowerCase().includes(lowercaseQuery) ||
            venue.type.toLowerCase().includes(lowercaseQuery)
          );
        }
        
        setFilteredVenues(filtered);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [query, filter]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredVenues(venues);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = venues.filter(venue => 
      venue.name.toLowerCase().includes(lowercaseQuery) || 
      venue.location.toLowerCase().includes(lowercaseQuery) ||
      venue.type.toLowerCase().includes(lowercaseQuery)
    );
    
    setFilteredVenues(filtered);
  };

  const applyFilters = () => {
    let filtered = [...venues];
    
    if (selectedSportType) {
      filtered = filtered.filter(venue => venue.type === selectedSportType);
    }
    
    filtered = filtered.filter(venue => 
      venue.pricePerHour >= priceRange[0] && 
      venue.pricePerHour <= priceRange[1] &&
      venue.rating >= minRating
    );
    
    setFilteredVenues(filtered);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedSportType(null);
    setPriceRange([0, 1000]);
    setMinRating(0);
    setFilteredVenues(venues);
    setShowFilters(false);
  };

  const handleMarkerPress = (venue: Venue) => {
    router.push(`/venue/${venue.slug}`);
  };

  const sportTypes = ['Football', 'Cricket', 'Tennis', 'Basketball', 'Swimming', 'Badminton'];
  const ratingOptions = [1, 2, 3, 4, 5];

  let MapView: any;
  let Marker: any;
  if (Platform.OS !== 'web') {
    const MapModule = require('react-native-maps');
    MapView = MapModule.default;
    Marker = MapModule.Marker;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setFilteredVenues(venues);
              }}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, !showMap ? styles.toggleButtonActive : null]}
          onPress={() => setShowMap(false)}
        >
          <Text style={[styles.toggleText, !showMap ? styles.toggleTextActive : null]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, showMap ? styles.toggleButtonActive : null]}
          onPress={() => setShowMap(true)}
        >
          <Text style={[styles.toggleText, showMap ? styles.toggleTextActive : null]}>Map</Text>
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Venues</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={20} color="#1F2937" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Sliders size={20} color="#2563EB" />
                <Text style={styles.filterSectionTitle}>Sport Type</Text>
              </View>
              <View style={styles.sportTypeContainer}>
                {sportTypes.map((sport) => (
                  <TouchableOpacity 
                    key={sport}
                    style={[
                      styles.sportTypeButton,
                      selectedSportType === sport ? styles.sportTypeButtonActive : null
                    ]}
                    onPress={() => setSelectedSportType(selectedSportType === sport ? null : sport)}
                  >
                    <Text 
                      style={[
                        styles.sportTypeText,
                        selectedSportType === sport ? styles.sportTypeTextActive : null
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
              </View>
              <View style={styles.priceRangeContainer}>
                <Text style={styles.priceRangeText}>
                  ${priceRange[0]} - ${priceRange[1]}
                </Text>
                <View style={styles.priceButtons}>
                  <TouchableOpacity 
                    style={styles.priceButton}
                    onPress={() => setPriceRange([0, 50])}
                  >
                    <Text style={styles.priceButtonText}>$0-$50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.priceButton}
                    onPress={() => setPriceRange([50, 100])}
                  >
                    <Text style={styles.priceButtonText}>$50-$100</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.priceButton}
                    onPress={() => setPriceRange([100, 1000])}
                  >
                    <Text style={styles.priceButtonText}>$100+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Star size={20} color="#2563EB" />
                <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              </View>
              <View style={styles.ratingContainer}>
                {ratingOptions.map((rating) => (
                  <TouchableOpacity 
                    key={rating}
                    style={[
                      styles.ratingButton,
                      minRating === rating ? styles.ratingButtonActive : null
                    ]}
                    onPress={() => setMinRating(minRating === rating ? 0 : rating)}
                  >
                    <Text 
                      style={[
                        styles.ratingText,
                        minRating === rating ? styles.ratingTextActive : null
                      ]}
                    >
                      {rating}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <>
          {showMap ? (
            Platform.OS === 'web' ? (
              <View style={styles.webMapFallback}>
                <Text style={styles.webMapText}>Map view is not available on web</Text>
                <TouchableOpacity 
                  style={styles.webMapButton}
                  onPress={() => setShowMap(false)}
                >
                  <Text style={styles.webMapButtonText}>Switch to List View</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mapContainer}>
                {(() => {
                  if (Platform.OS === 'web') {
                    return null;
                  }
                  
                  const { default: MapView, Marker } = require('react-native-maps');
                  
                  return (
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: 30.409520112380957,
                        longitude: 77.95852843921004,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      }}
                    >
                      {filteredVenues.map((venue) => (
                        <Marker
                          key={venue.id}
                          coordinate={{
                            latitude: venue.coordinates.latitude,
                            longitude: venue.coordinates.longitude
                          }}
                          title={venue.name}
                          description={`${venue.type} • $${venue.pricePerHour}/hr`}
                          onPress={() => handleMarkerPress(venue)}
                        />
                      ))}
                    </MapView>
                  );
                })()}
              </View>
            )
          ) : (
            <ScrollView contentContainerStyle={styles.venueList}>
              {filteredVenues.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No venues found</Text>
                  <Text style={styles.noResultsSubtext}>Try adjusting your search or filters</Text>
                </View>
              ) : (
                filteredVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} size="small" />
                ))
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    marginRight: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: 500,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  sportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sportTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  sportTypeButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  sportTypeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  sportTypeTextActive: {
    color: '#2563EB',
  },
  priceRangeContainer: {
    marginBottom: 8,
  },
  priceRangeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  priceButtons: {
    flexDirection: 'row',
  },
  priceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  priceButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  ratingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  ratingButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  ratingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  ratingTextActive: {
    color: '#2563EB',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  resetButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  venueList: {
    padding: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  webMapText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  webMapButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  webMapButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});