import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { venueApi } from '@/api/venueApi';
import { bookingApi } from '@/api/bookingApi';
import { Venue, VenueService, VenueCourt } from '@/types/venue';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Star, MapPin, Clock, IndianRupee, Calendar, ArrowRight, ChevronRight } from 'lucide-react-native';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedService, setSelectedService] = useState<VenueService | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<VenueCourt | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  
  const today = new Date();
  const nextDays = Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(today.getDate() + i);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: date.toISOString().split('T')[0]
    };
  });

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        if (!id) return;
        const response = await venueApi.getVenueBySlug(id);
        setVenue(response);
        
        // Set initial selections
        setSelectedDate(nextDays[0].fullDate);
        if (response.services && response.services.length > 0) {
          setSelectedService(response.services[0]);
          if (response.services[0].courts && response.services[0].courts.length > 0) {
            setSelectedCourt(response.services[0].courts[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching venue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [id]);
  
  // Fetch available time slots when date or court changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedDate && selectedCourt && venue) {
        setAvailabilityLoading(true);
        try {
          console.log('Fetching availability for:', { venue: venue.id, court: selectedCourt.id, date: selectedDate });
          const availability = await bookingApi.getCourtAvailability(
            venue.id,
            selectedCourt.id.toString(),
            selectedDate
          );
          
          console.log('Availability response:', availability);
          
          // Process availability data to get available slots
          if (availability && availability.available_slots) {
            setAvailableTimeSlots(availability.available_slots);
          } else if (availability && availability.slots) {
            // Handle different response structure
            const availableSlots = availability.slots
              .filter((slot: any) => slot.available || !slot.booked)
              .map((slot: any) => slot.time || slot.start_time);
            setAvailableTimeSlots(availableSlots);
          } else {
            // Fallback to generating slots if API doesn't return them
            generateTimeSlots();
          }
        } catch (error) {
          console.error('Error fetching availability:', error);
          // Fallback to generating slots
          generateTimeSlots();
        } finally {
          setAvailabilityLoading(false);
        }
      }
    };

    const generateTimeSlots = () => {
      if (!selectedCourt) return;
      
      // Use day and night time slots
      const dayStartHour = parseInt(selectedCourt.day_start_time?.split(':')[0] || selectedCourt.start_time?.split(':')[0] || '6');
      const dayEndHour = parseInt(selectedCourt.day_end_time?.split(':')[0] || '17');
      const nightStartHour = parseInt(selectedCourt.night_start_time?.split(':')[0] || '17');
      const nightEndHour = parseInt(selectedCourt.night_end_time?.split(':')[0] || selectedCourt.end_time?.split(':')[0] || '23');
      const duration = parseInt(selectedCourt.duration || '60');

      if (isNaN(dayStartHour) || isNaN(nightEndHour) || isNaN(duration)) {
        console.warn("Invalid time data", { dayStartHour, nightEndHour, duration });
        setAvailableTimeSlots([]);
        return;
      }

      const slots = [];
      
      // Generate day slots
      for (let hour = dayStartHour; hour < dayEndHour; hour += (duration / 60)) {
        const startHour = Math.floor(hour);
        const startMinute = (hour % 1) * 60;
        const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
      
      // Generate night slots
      for (let hour = nightStartHour; hour < nightEndHour; hour += (duration / 60)) {
        const startHour = Math.floor(hour);
        const startMinute = (hour % 1) * 60;
        const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }

      console.log('Generated time slots:', slots);
      setAvailableTimeSlots(slots);
    };

    fetchAvailability();
    setSelectedTimeSlots([]);
  }, [selectedDate, selectedCourt, venue]);

  const handleServiceChange = (service: VenueService) => {
    setSelectedService(service);
    if (service.courts && service.courts.length > 0) {
      setSelectedCourt(service.courts[0]);
    }
    setSelectedTimeSlots([]);
  };

  const handleCourtChange = (court: VenueCourt) => {
    setSelectedCourt(court);
    setSelectedTimeSlots([]);
  };

  const handleTimeSlotToggle = (slot: string) => {
    setSelectedTimeSlots(prev => {
      if (prev.includes(slot)) {
        return prev.filter(s => s !== slot);
      } else {
        return [...prev, slot].sort();
      }
    });
  };

  const calculateTotalAmount = () => {
    if (!selectedCourt || selectedTimeSlots.length === 0) return 0;
    
    let total = 0;
    selectedTimeSlots.forEach(slot => {
      const hour = parseInt(slot.split(':')[0]);
      const dayEndHour = parseInt(selectedCourt.day_end_time?.split(':')[0] || '17');
      
      // Use night price if slot is after day end time, otherwise use day price
      if (hour >= dayEndHour) {
        total += parseFloat(selectedCourt.night_slot_price || selectedCourt.slot_price);
      } else {
        total += parseFloat(selectedCourt.day_slot_price || selectedCourt.slot_price);
      }
    });
    
    return total;
  };

  const handleBooking = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to book this venue',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => router.push('/(auth)/login')
          }
        ]
      );
      return;
    }
    
    if (selectedTimeSlots.length === 0 || !selectedCourt || !venue) {
      Alert.alert('Error', 'Please select time slots to continue');
      return;
    }
    
    // Calculate booking slots
    const duration = parseInt(selectedCourt.duration || '60');
    const bookingSlots = selectedTimeSlots.map(slot => {
      const [startHour, startMinute] = slot.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMinute + duration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      return {
        startTime: slot,
        endTime: endTime
      };
    });

    router.push({
      pathname: '/booking/confirm',
      params: {
        venueId: venue.slug,
        venueName: venue.name,
        facility_id: venue.id,
        serviceId: selectedService?.id.toString(),
        courtId: selectedCourt.id.toString(),
        date: selectedDate,
        bookingSlots: JSON.stringify(bookingSlots),
        totalAmount: totalAmount.toString(),
        courtName: selectedCourt.court_name,
        serviceName: selectedService?.name || 'Service',
        totalSlots: selectedTimeSlots.length.toString()
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Venue not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalAmount = calculateTotalAmount();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <FlatList
            data={venue.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image 
                source={{ uri: item }} 
                style={[styles.venueImage, { width }]} 
              />
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.venueInfoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.ratingContainer}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
            </View>
          </View>
          
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>{venue.location}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Clock size={16} color="#2563EB" />
              <Text style={styles.infoText}>
                {selectedCourt ? `${selectedCourt.start_time} - ${selectedCourt.end_time}` : `${venue.openingTime} - ${venue.closingTime}`}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <IndianRupee size={16} color="#2563EB" />
              <Text style={styles.infoText}>
                ₹{selectedCourt ? selectedCourt.slot_price : venue.pricePerHour}/hour
              </Text>
            </View>
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descriptionText}>{venue.description}</Text>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {venue.amenities.map((amenity, index) => (
              <View key={index} style={styles.amenityItem}>
                <View style={styles.amenityDot} />
                <Text style={styles.amenityText}>{amenity.name}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webMapFallback}>
                <Text style={styles.webMapText}>Map view is not available on web</Text>
              </View>
            ) : (
              (() => {
                let MapView: any;
                let Marker: any;
                if (Platform.OS !== 'web') {
                  const MapModule = require('react-native-maps');
                  MapView = MapModule.default;
                  Marker = MapModule.Marker;
                }
                
                return (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: venue.coordinates.latitude,
                      longitude: venue.coordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: venue.coordinates.latitude,
                        longitude: venue.coordinates.longitude
                      }}
                      title={venue.name}
                    />
                  </MapView>
                );
              })()
            )}
            
            <TouchableOpacity style={styles.viewOnMapButton}>
              <Text style={styles.viewOnMapText}>View on Map</Text>
              <ChevronRight size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Booking</Text>
          
          {/* Service Selection */}
          {venue.services && venue.services.length > 1 && (
            <>
              <Text style={styles.selectionTitle}>Select Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.serviceContainer}>
                  {venue.services.map((service) => (
                    <TouchableOpacity 
                      key={service.id}
                      style={[
                        styles.serviceItem,
                        selectedService?.id === service.id && styles.selectedServiceItem
                      ]}
                      onPress={() => handleServiceChange(service)}
                    >
                      <Text 
                        style={[
                          styles.serviceText,
                          selectedService?.id === service.id && styles.selectedServiceText
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Court Selection */}
          {selectedService && selectedService.courts && selectedService.courts.length > 1 && (
            <>
              <Text style={styles.selectionTitle}>Select Court</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.courtContainer}>
                  {selectedService.courts.map((court) => (
                    <TouchableOpacity 
                      key={court.id}
                      style={[
                        styles.courtItem,
                        selectedCourt?.id === court.id && styles.selectedCourtItem
                      ]}
                      onPress={() => handleCourtChange(court)}
                    >
                      <Text 
                        style={[
                          styles.courtText,
                          selectedCourt?.id === court.id && styles.selectedCourtText
                        ]}
                      >
                        {court.court_name}
                      </Text>
                      <Text 
                        style={[
                          styles.courtPrice,
                          selectedCourt?.id === court.id && styles.selectedCourtPrice
                        ]}
                      >
                        ₹{court.slot_price}/hr
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          
          <Text style={styles.dateSelectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateContainer}>
              {nextDays.map((day, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.dateItem,
                    selectedDate === day.fullDate && styles.selectedDateItem
                  ]}
                  onPress={() => setSelectedDate(day.fullDate)}
                >
                  <Text 
                    style={[
                      styles.dayText,
                      selectedDate === day.fullDate && styles.selectedDayText
                    ]}
                  >
                    {day.day}
                  </Text>
                  <Text 
                    style={[
                      styles.dateText,
                      selectedDate === day.fullDate && styles.selectedDateText
                    ]}
                  >
                    {day.date}
                  </Text>
                  <Text 
                    style={[
                      styles.monthText,
                      selectedDate === day.fullDate && styles.selectedMonthText
                    ]}
                  >
                    {day.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Text style={styles.timeSelectionTitle}>
            Select Time Slots {selectedTimeSlots.length > 0 && `(${selectedTimeSlots.length} selected)`}
          </Text>
          
          {availabilityLoading ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingSlotsText}>Loading available slots...</Text>
            </View>
          ) : availableTimeSlots.length > 0 ? (
            <View style={styles.timeSlotContainer}>
              {availableTimeSlots.map((slot, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.timeSlot,
                    selectedTimeSlots.includes(slot) && styles.selectedTimeSlot
                  ]}
                  onPress={() => handleTimeSlotToggle(slot)}
                >
                  <View style={styles.timeSlotContent}>
                    <Text 
                      style={[
                        styles.timeSlotText,
                        selectedTimeSlots.includes(slot) && styles.selectedTimeSlotText
                      ]}
                    >
                      {slot}
                    </Text>
                    <Text 
                      style={[
                        styles.timeSlotPrice,
                        selectedTimeSlots.includes(slot) && styles.selectedTimeSlotPriceSelected
                      ]}
                    >
                      ₹{(() => {
                        const hour = parseInt(slot.split(':')[0]);
                        const dayEndHour = parseInt(selectedCourt?.day_end_time?.split(':')[0] || '17');
                        return hour >= dayEndHour 
                          ? selectedCourt?.night_slot_price || selectedCourt?.slot_price
                          : selectedCourt?.day_slot_price || selectedCourt?.slot_price;
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>No time slots available for selected date</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {selectedTimeSlots.length > 1 ? 'Total' : 'Price'}
            </Text>
            <Text style={styles.priceValue}>
              ₹{totalAmount || (selectedCourt ? selectedCourt.day_slot_price : venue.pricePerHour)}
            </Text>
            {selectedTimeSlots.length <= 1 && (
              <Text style={styles.priceUnit}>/hour</Text>
            )}
            {selectedTimeSlots.length > 1 && (
              <Text style={styles.priceUnit}>({selectedTimeSlots.length} slots)</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.bookButton,
              selectedTimeSlots.length === 0 && styles.bookButtonDisabled
            ]}
            onPress={handleBooking}
            disabled={selectedTimeSlots.length === 0}
          >
            <Text style={styles.bookButtonText}>
              Book {selectedTimeSlots.length > 1 ? `${selectedTimeSlots.length} Slots` : 'Now'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
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
  scrollContent: {
    paddingBottom: 40,
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
  imageContainer: {
    position: 'relative',
  },
  venueImage: {
    height: 250,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfoContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  ratingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 12,
  },
  selectionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  descriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  amenityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 8,
  },
  amenityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
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
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
  },
  viewOnMapText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2563EB',
    marginRight: 4,
  },
  serviceContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  serviceItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
  },
  selectedServiceItem: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  serviceText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  selectedServiceText: {
    color: '#FFFFFF',
  },
  courtContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  courtItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
    alignItems: 'center',
  },
  selectedCourtItem: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  courtText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  selectedCourtText: {
    color: '#FFFFFF',
  },
  courtPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  selectedCourtPrice: {
    color: '#FFFFFF',
  },
  dateSelectionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dateItem: {
    width: 64,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedDateItem: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dateText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 2,
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  monthText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  selectedMonthText: {
    color: '#FFFFFF',
  },
  timeSelectionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  loadingSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingSlotsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
    marginBottom: 12,
    minWidth: 80,
  },
  selectedTimeSlot: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  timeSlotContent: {
    alignItems: 'center',
  },
  timeSlotText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  timeSlotPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  selectedTimeSlotPriceSelected: {
    color: '#FFFFFF',
  },
  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 24,
  },
  noSlotsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  priceValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1F2937',
  },
  priceUnit: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  bookButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
});