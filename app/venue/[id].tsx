import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, useWindowDimensions, Platform, Share, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { venueApi } from '@/api/venueApi';
import { bookingApi } from '@/api/bookingApi';
import { reviewApi } from '@/api/reviewApi';
import { Venue, VenueService, VenueCourt } from '@/types/venue';
import { Review } from '@/types/review';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Star, MapPin, Clock, IndianRupee, ArrowRight, ChevronRight, ChevronLeft, CalendarDays, Send, MessageSquare } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';


const toISODate = (d: Date) => d.toISOString().split('T')[0];


export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const SLOT_COLUMNS = 3;
  const SLOT_GAP = 12;
  const SLOT_CONTAINER_HORIZONTAL_PADDING = 40; // matches common padding/margins in this screen
  const slotItemWidth = (width - SLOT_CONTAINER_HORIZONTAL_PADDING - (SLOT_COLUMNS - 1) * SLOT_GAP) / SLOT_COLUMNS;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [courtNames, setCourtNames] = useState<string[]>([]);
  const [selectedCourtName, setSelectedCourtName] = useState<string>('');
  const [slotsData, setSlotsData] = useState<any>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ time: string; price: number }[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedCourtDetails, setSelectedCourtDetails] = useState<any>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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

        const courtNamesArray = response.court_names || [];
        setCourtNames(courtNamesArray);

        setSelectedDate(nextDays[0].fullDate);
        if (courtNamesArray.length > 0) {
          setSelectedCourtName(courtNamesArray[0]);
        }
      } catch (error) {
        console.error('Error fetching venue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!venue) return;
      setReviewsLoading(true);
      try {
        const reviewsData = await reviewApi.getReviewsByFacilityId(venue.id);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [venue]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedDate && selectedCourtName && venue) {
        setAvailabilityLoading(true);
        try {
          const fetchedSlotsData = await venueApi.getSlotsByDate(selectedDate, venue.slug);
          setSlotsData(fetchedSlotsData);

          if (fetchedSlotsData && fetchedSlotsData.services) {
            const services = fetchedSlotsData.services || [];

            // selectedCourtName can be either:
            // 1) a service name (Cricket/Fooothall) OR
            // 2) a court name (Court 1 (1 v 1 ) / Court 2 (2 v 2))
            const matchingService = services.find((s: any) => s.name === selectedCourtName);
            const matchingCourt = services
              .flatMap((s: any) => s.courts || s.court || [])
              .find((c: any) => c.court_name === selectedCourtName || c.name === selectedCourtName);

            const resolvedCourt = matchingCourt || (matchingService?.courts?.[0] ?? matchingService?.court?.[0]);

            if (resolvedCourt) {
              setSelectedCourtDetails(resolvedCourt);

              if (resolvedCourt?.slots && Array.isArray(resolvedCourt.slots)) {
                const filteredSlots = filterPastSlots(resolvedCourt.slots, selectedDate);
                setAvailableTimeSlots(filteredSlots);
              } else {
                setAvailableTimeSlots([]);
              }
            } else {
              setAvailableTimeSlots([]);
              setSelectedCourtDetails(null);
            }
          } else {
            setAvailableTimeSlots([]);
            setSelectedCourtDetails(null);
          }
        } catch (error) {
          console.error('Error fetching slots:', error);
          setAvailableTimeSlots([]);
          setSelectedCourtDetails(null);
        } finally {
          setAvailabilityLoading(false);
        }
      }
    };

    fetchAvailability();
    setSelectedTimeSlots([]);
  }, [selectedDate, selectedCourtName, venue]);

  const filterPastSlots = (slots: { time: string; price: number }[], date: string) => {
    const selectedDateObj = new Date(date);
    const todayDateObj = new Date();

    todayDateObj.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);

    const isToday = selectedDateObj.getTime() === todayDateObj.getTime();

    if (!isToday) {
      return slots;
    }

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    return slots.filter(slot => {
      const [startTime] = slot.time.split(' - ');
      const [hours, minutes] = startTime.split(':').map(Number);

      if (hours > currentHour) {
        return true;
      }
      if (hours === currentHour && minutes > currentMinute) {
        return true;
      }
      return false;
    });
  };

  const handleCourtChange = (courtName: string) => {
    setSelectedCourtName(courtName);
    setSelectedTimeSlots([]);
  };

  const MAX_SLOTS = 3;

  const handleTimeSlotToggle = (slot: string) => {


    setSelectedTimeSlots((prev) => {
      const isAlreadySelected = prev.includes(slot);

      // Always allow deselect
      if (isAlreadySelected) {
        return prev.filter((s) => s !== slot);
      }


      // Block selecting beyond limit
      if (prev.length >= MAX_SLOTS) {
        Alert.alert('Limit reached', `You can book up to ${MAX_SLOTS} time slots.`);
        return prev;
      }

      return [...prev, slot].sort();
    });
  };

  const calculateTotalAmount = () => {
    if (selectedTimeSlots.length === 0) return 0;

    let total = 0;
    selectedTimeSlots.forEach(slotTime => {
      const slotData = availableTimeSlots.find(s => s.time === slotTime);
      if (slotData) {
        total += slotData.price;
      }
    });

    return total;
  };

  const handleShareVenue = async () => {
    if (!venue?.slug) {
      Alert.alert('Unable to share', 'Venue link is not available yet.');
      return;
    }

    const url = `https://bookvenue.app/facility/${venue.slug}`;
    try {
      await Share.share({
        message: `Check out ${venue.name} on BookVenue: ${url}`,
        url,
        title: 'Share Venue',
      });
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const handleBooking = () => {
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


    if (selectedTimeSlots.length === 0 || !selectedCourtDetails || !venue) {
      Alert.alert('Error', 'Please select time slots to continue');
      return;
    }

    const MAX_SLOTS = 3;
    if (selectedTimeSlots.length > MAX_SLOTS) {
      Alert.alert('Limit reached', `You can book up to ${MAX_SLOTS} time slots.`);
      return;
    }


const bookingSlots = selectedTimeSlots.map((slotTime) => {
      const [startTime, endTime] = slotTime.split(' - ');
      const slotData = availableTimeSlots.find((s) => s.time === slotTime);
      return {
        startTime: startTime,
        endTime: endTime,
        price: slotData?.price ?? 0,
      };
    });

    const matchingService = slotsData?.services?.find(
      (s: any) => s.name === selectedCourtName
    );

    router.push({
      pathname: '/booking/confirm',
      params: {
        venueId: venue.slug,
        venueName: venue.name,
        facility_id: venue.id,
        serviceId: matchingService?.id.toString() || '',
        courtId: selectedCourtDetails.id.toString(),
        date: selectedDate,
        bookingSlots: JSON.stringify(bookingSlots),
        totalAmount: totalAmount.toString(),
        courtName: selectedCourtDetails.court_name,
        serviceName: selectedCourtName,
        totalSlots: selectedTimeSlots.length.toString()
      }
    });
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to submit a review', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (reviewRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    if (!reviewMessage.trim()) {
      Alert.alert('Review Required', 'Please write a review message');
      return;
    }

    if (!venue) return;

    setSubmittingReview(true);
    try {
      await reviewApi.createReview({
        facility_id: parseInt(venue.id),
        user_id: parseInt(user.user_id || user.id || '0'),
        rating: reviewRating,
        message: reviewMessage.trim(),
      });

      // Refresh reviews
      const reviewsData = await reviewApi.getReviewsByFacilityId(venue.id);
      setReviews(reviewsData);

      setReviewRating(0);
      setReviewMessage('');
      Alert.alert('Success', 'Review submitted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
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
            ref={flatListRef}
            data={venue.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
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

          {venue.images.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <TouchableOpacity
                  style={styles.prevButton}
                  onPress={() => {
                    const newIndex = currentImageIndex - 1;
                    setCurrentImageIndex(newIndex);
                    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                  }}
                >
                  <ChevronLeft size={28} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              )}

              {currentImageIndex < venue.images.length - 1 && (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => {
                    const newIndex = currentImageIndex + 1;
                    setCurrentImageIndex(newIndex);
                    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                  }}
                >
                  <ChevronRight size={28} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              )}

              <View style={styles.imageIndicatorContainer}>
                {venue.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageIndicator,
                      index === currentImageIndex && styles.imageIndicatorActive
                    ]}
                  />
                ))}
              </View>
            </>
          )}
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
                {selectedCourtDetails ? `${selectedCourtDetails.day_start_time} - ${selectedCourtDetails.night_end_time}` : `${venue.openingTime} - ${venue.closingTime}`}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <IndianRupee size={16} color="#2563EB" />
              <Text style={styles.infoText}>
                ₹{selectedCourtDetails ? selectedCourtDetails.day_slot_price : venue.pricePerHour}/hour
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.shareVenueIconButton}
            onPress={handleShareVenue}
            accessibilityRole="button"
            accessibilityLabel="Share Venue"
          >
            <Text style={styles.shareVenueIcon}>↗</Text>
          </TouchableOpacity>


          <Text style={styles.sectionTitle}>About</Text>
          <Text
            style={styles.descriptionText}
            numberOfLines={showFullDescription ? undefined : 4}
          >
            {venue.description}
          </Text>

          {venue.description && venue.description.length > 200 && (
            <TouchableOpacity
              onPress={() => setShowFullDescription(!showFullDescription)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>
                {showFullDescription ? 'Show Less' : 'Show More'}
              </Text>
            </TouchableOpacity>
          )}

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
            {(() => {
              const MapModule = require('react-native-maps');
              const MapView = MapModule.default;
              const Marker = MapModule.Marker;

              return (
                <MapView
                  provider="google"
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
                      longitude: venue.coordinates.longitude,
                    }}
                    title={venue.name}
                  />
                </MapView>
              );
            })()}

            <TouchableOpacity style={styles.viewOnMapButton}>
              <Text style={styles.viewOnMapText}>View on Map</Text>
              <ChevronRight size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Booking</Text>


          {courtNames.length > 1 && (
            <>
              <Text style={styles.selectionTitle}>Select Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.serviceContainer}>
                  {courtNames.map((courtName) => (
                    <TouchableOpacity
                      key={courtName}
                      style={[
                        styles.serviceItem,
                        selectedCourtName === courtName && styles.selectedServiceItem
                      ]}
                      onPress={() => handleCourtChange(courtName)}
                    >
                      <Text
                        style={[
                          styles.serviceText,
                          selectedCourtName === courtName && styles.selectedServiceText
                        ]}
                      >
                        {courtName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Date Selection */}
          <Text style={styles.dateSelectionTitle}>Select Date</Text>





          {/* Quick date picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateContainer}>
              {nextDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    selectedDate === day.fullDate && styles.selectedDateItem
                  ]}
                  onPress={() => {
                    setSelectedDate(day.fullDate);
                  }}
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

          {/* Calendar icon (opens popup date picker) */}
          <TouchableOpacity
            style={styles.calendarIconButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <CalendarDays size={22} color="#2563EB" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate ? new Date(selectedDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: DateTimePickerEvent) => {
                // On iOS, user can cancel by dismissing; on Android, event.type will fire.
                // If dismissed, do nothing.
                if (event.type === 'dismissed') {
                  setShowDatePicker(false);
                  return;
                }

                const pickedDate = event.nativeEvent.timestamp;
                const iso = new Date(pickedDate).toISOString().split('T')[0];
                setSelectedDate(iso);
                setShowDatePicker(false);
              }}
            />
          )}




          {selectedCourtDetails && (
            <View style={styles.courtInfoCard}>
              <View style={styles.courtInfoRow}>
                <Text style={styles.courtInfoLabel}>Day Slots:</Text>
                <Text style={styles.courtInfoValue}>₹{selectedCourtDetails.day_slot_price}/hr</Text>
              </View>
              <View style={styles.courtInfoRow}>
                <Text style={styles.courtInfoLabel}>Night Slots:</Text>
                <Text style={styles.courtInfoValue}>₹{selectedCourtDetails.night_slot_price}/hr</Text>
              </View>
              <View style={styles.courtInfoRow}>
                <Text style={styles.courtInfoLabel}>Duration:</Text>
                <Text style={styles.courtInfoValue}>{selectedCourtDetails.duration} minutes</Text>
              </View>
            </View>
          )}

          <Text style={styles.timeSelectionTitle}>
            Select Time Slots {selectedTimeSlots.length > 0 && `(${selectedTimeSlots.length} selected)`}
          </Text>

          {!selectedCourtName ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>Please select a sport to view available time slots</Text>
            </View>
          ) : availabilityLoading ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingSlotsText}>Loading available slots...</Text>
            </View>
          ) : availableTimeSlots.length > 0 ? (
            <View style={styles.timeSlotContainer}>
              {/** Exactly 3 aligned columns */}
              {availableTimeSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    {
                      width: slotItemWidth,
                      marginRight: index % 3 === 2 ? 0 : SLOT_GAP,
                    },
                    selectedTimeSlots.includes(slot.time) && styles.selectedTimeSlot
                  ]}
                  onPress={() => handleTimeSlotToggle(slot.time)}
                >
                  <View style={styles.timeSlotContent}>
                    <Text
                      style={[
                        styles.timeSlotText,
                        selectedTimeSlots.includes(slot.time) && styles.selectedTimeSlotText
                      ]}
                    >
                      {slot.time}
                    </Text>
                    <Text
                      style={[
                        styles.timeSlotPrice,
                        selectedTimeSlots.includes(slot.time) && styles.selectedTimeSlotPriceSelected
                      ]}
                    >
                      ₹{slot.price}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>No time slots available for selected date and court</Text>
            </View>
          )}

          <View style={styles.separator} />

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <MessageSquare size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.length > 0 && (
                <Text style={styles.reviewCount}>({reviews.length})</Text>
              )}
            </View>

            {/* Write Review */}
            <View style={styles.writeReviewCard}>
              <Text style={styles.writeReviewTitle}>Write a Review</Text>

              <View style={styles.starRatingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={28}
                      color={star <= reviewRating ? '#F59E0B' : '#D1D5DB'}
                      fill={star <= reviewRating ? '#F59E0B' : 'none'}
                    />
                  </TouchableOpacity>
                ))}
                {reviewRating > 0 && (
                  <Text style={styles.ratingLabelText}>
                    {reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Fair' : reviewRating === 3 ? 'Good' : reviewRating === 4 ? 'Very Good' : 'Excellent'}
                  </Text>
                )}
              </View>

              <View style={styles.reviewInputContainer}>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience..."
                  placeholderTextColor="#9CA3AF"
                  value={reviewMessage}
                  onChangeText={setReviewMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitReviewButton, (submittingReview || reviewRating === 0 || !reviewMessage.trim()) && styles.submitReviewButtonDisabled]}
                onPress={handleSubmitReview}
                disabled={submittingReview || reviewRating === 0 || !reviewMessage.trim()}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={16} color="#FFFFFF" />
                    <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Reviews List */}
            {reviewsLoading ? (
              <View style={styles.reviewsLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.noReviewsContainer}>
                <MessageSquare size={32} color="#9CA3AF" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to share your experience</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {(review.user_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.user_name || 'User'}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewStarsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          color={star <= review.rating ? '#F59E0B' : '#D1D5DB'}
                          fill={star <= review.rating ? '#F59E0B' : 'none'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewMessage}>{review.message}</Text>
                </View>
              ))
            )}
          </View>
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
              ₹{totalAmount || (selectedCourtDetails ? selectedCourtDetails.day_slot_price : venue.pricePerHour)}
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
    zIndex: 10,
  },
  prevButton: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  nextButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
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
  showMoreButton: {
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  showMoreText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563EB',
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
  courtInfoCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  courtInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  courtInfoLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  courtInfoValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1F2937',
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
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  timeSlotPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#6B7280',
  },
  selectedTimeSlotPriceSelected: {
    color: '#FFFFFF',
  },
  shareVenueIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  shareVenueIcon: {
    fontSize: 18,
    lineHeight: 18,
    color: '#2563EB',
    fontFamily: 'Inter-SemiBold',
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
    // Platform.OS is a union of known RN targets; avoid hardcoding 'web'
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

  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 16,
  },
  calendarTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 10,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: '28%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarDaySelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  calendarDayText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 2,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarDaySubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#6B7280',
  },
  calendarIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: -10,
    marginBottom: 16,
    marginLeft: 2,
  },
  reviewsSection: {
    marginBottom: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  writeReviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  writeReviewTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  starRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingLabelText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 8,
  },
  reviewInputContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  reviewInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1F2937',
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  submitReviewButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitReviewButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  reviewsLoadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  noReviewsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerInitial: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563EB',
  },
  reviewerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1F2937',
  },
  reviewDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  reviewStarsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
