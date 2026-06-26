import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi';

type TranslationParams = Record<string, string | number>;

type TranslationKeys =
  | 'profile'
  | 'notLoggedInTitle'
  | 'notLoggedInText'
  | 'goToLogin'
  | 'savedAddresses'
  | 'notifications'
  | 'privacySecurity'
  | 'helpSupport'
  | 'myVenues'
  | 'editProfile'
  | 'logout'
  | 'version'
  | 'latestBlogs'
  | 'seeAll'
  | 'noBlogsAvailable'
  | 'venueOwner'
  | 'language'
  | 'english'
  | 'hindi'
  | 'selectLanguage'
  | 'languageUpdated'
  | 'hello'
  | 'exploreVenuesNearYou'
  | 'login'
  | 'searchVenues'
  | 'bannerTitle'
  | 'bannerSubtitle'
  | 'explore'
  | 'featuredVenues'
  | 'noCategoryVenuesFound'
  | 'categories'
  | 'nearbyVenues'
  | 'noCategoryVenuesNearby'
  | 'filterVenues'
  | 'sportType'
  | 'priceRange'
  | 'minimumRating'
  | 'reset'
  | 'applyFilters'
  | 'list'
  | 'map'
  | 'mapViewNotAvailable'
  | 'switchToListView'
  | 'noVenuesFound'
  | 'tryAdjustingSearch'
  | 'myBookings'
  | 'upcoming'
  | 'pending'
  | 'past'
  | 'loadingBookings'
  | 'failedLoadBookings'
  | 'loadingBookingDetails'
  | 'tryAgain'
  | 'noBookings'
  | 'noUpcomingBookings'
  | 'noPendingBookings'
  | 'noPastBookings'
  | 'exploreVenues'
  | 'bookingDetails'
  | 'bookingInformation'
  | 'date'
  | 'time'
  | 'totalAmount'
  | 'cancelBooking'
  | 'contactVenueOwner'
  | 'bookingsUnknownError'
  | 'savedAddressesTitle'
  | 'homeLabel'
  | 'noSavedAddresses'
  | 'addAddress'
  | 'about'
  | 'amenities'
  | 'location'
  | 'viewOnMap'
  | 'booking'
  | 'selectSport'
  | 'selectDate'
  | 'daySlots'
  | 'nightSlots'
  | 'duration'
  | 'pleaseSelectSport'
  | 'loadingAvailableSlots'
  | 'noTimeSlotsAvailable'
  | 'reviews'
  | 'writeReview'
  | 'shareYourExperience'
  | 'submitReview'
  | 'loadingReviews'
  | 'noReviewsYet'
  | 'beFirstReview'
  | 'viewMore'
  | 'viewLess'
  | 'pricePerHour'
  | 'thankYouReading'
  | 'goBack'
  | 'oops'
  | 'screenDoesNotExist'
  | 'goToHomeScreen'
  | 'loginRequired'
  | 'welcome'
  | 'enterYourFullName'
  | 'enterYourEmail'
  | 'enterYourPhoneNumber'
  | 'enterYourAddress'
  | 'saveChanges'
  | 'profileUpdated'
  | 'profilePicture'
  | 'enterNameLabel'
  | 'enterEmailLabel'
  | 'enterPhoneLabel'
  | 'enterAddressLabel'
  | 'continueWithEmail'
  | 'continueWithPhone'
  | 'loginTagline'
  | 'registerTagline'
  | 'enterVerificationCode'
  | 'enterOTPPlaceholder'
  | 'invalidInput'
  | 'invalidEmailOrPhone'
  | 'failedToSendOtp'
  | 'otpVerificationFailed'
  | 'dontHaveAccount'
  | 'signUpLink'
  | 'resendOtpTimer'
  | 'registrationFailed'
  | 'emailAddress'
  | 'phoneNumber'
  | 'continue'
  | 'verifyAndContinue'
  | 'resendOTP'
  | 'sendOTP'
  | 'createAccount'
  | 'alreadyHaveAccount'
  | 'loginLink'
  | 'registerWithPhone'
  | 'invalidEmail'
  | 'invalidPhoneNumber'
  | 'invalidOTP'
  | 'otpSentMessage'
  | 'termsAndConditions'
  | 'limitReached'
  | 'limitReachedMessage'
  | 'unableToShare'
  | 'venueLinkNotAvailable'
  | 'pleaseLogInToBookVenue'
  | 'errorSelectTimeSlots'
  | 'pleaseLogInToSubmitReview'
  | 'ratingRequired'
  | 'selectRating'
  | 'ratingPoor'
  | 'ratingFair'
  | 'ratingGood'
  | 'ratingVeryGood'
  | 'ratingExcellent'
  | 'reviewRequired'
  | 'reviewSubmittedSuccess'
  | 'failedSubmitReview'
  | 'durationPerSlot'
  | 'slotDuration'
  | 'numberOfSlots'
  | 'showMore'
  | 'showLess'
  | 'price'
  | 'total'
  | 'bookNow'
  | 'bookSlots'
  | 'confirmYourBooking'
  | 'reviewYourBookingDetails'
  | 'dateTime'
  | 'paymentSummary'
  | 'pay'
  | 'payAmount'
  | 'paymentCancelled'
  | 'paymentCancelledMessage'
  | 'paymentFailed'
  | 'paymentFailedMessage'
  | 'loginToCompleteBooking'
  | 'unknownVenue'
  | 'court'
  | 'service'
  | 'cancel'
  | 'logoutConfirm'
  | 'failedLogout'
  | 'couldNotOpenLink'
  | 'venueNotFound'
  | 'reviewMessageRequired'
  | 'statusConfirmed'
  | 'statusPending'
  | 'statusCancelled'
  | 'bookingId'
  | 'selectTimeSlots'
  | 'selectedSlotsCount'
  | 'comingSoon'
  | 'venueManagementComingSoon'
  | 'share'
  | 'sharingFunctionality'
  | 'cancelBookingConfirm'
  | 'yesCancel'
  | 'blogNotFound'
  | 'failedLoadBlog'
  | 'shareBookingMessage'
  | 'shareBlogMessage'
  | 'no'
  | 'yes';

const translations: Record<Language, Record<TranslationKeys, string>> = {
  en: {
    profile: 'Profile',
    notLoggedInTitle: "You're not logged in",
    notLoggedInText: 'Please log in to view your profile',
    goToLogin: 'Go to Login',
    savedAddresses: 'Saved Addresses',
    notifications: 'Notifications',
    privacySecurity: 'Privacy & Security',
    helpSupport: 'Help & Support',
    myVenues: 'My Venues',
    editProfile: 'Edit Profile',
    logout: 'Logout',
    version: 'Version 1.0.0',
    latestBlogs: 'Latest Blogs',
    seeAll: 'See All',
    noBlogsAvailable: 'No blogs available',
    venueOwner: 'Venue Owner',
    language: 'Language',
    english: 'English',
    hindi: 'Hindi',
    selectLanguage: 'Select language',
    languageUpdated: 'Language updated',
    welcome: 'Welcome',
    hello: 'Hello, {name}',
    exploreVenuesNearYou: 'Explore venues near you',
    login: 'Login',
    searchVenues: 'Search venues...',
    bannerTitle: 'Book Your Perfect Venue',
    bannerSubtitle: 'Get 15% off your first booking',
    explore: 'Explore',
    featuredVenues: 'Featured Venues',
    noCategoryVenuesFound: 'No {category} venues found',
    categories: 'Categories',
    nearbyVenues: 'Nearby Venues',
    noCategoryVenuesNearby: 'No {category} venues nearby',
    filterVenues: 'Filter Venues',
    sportType: 'Sport Type',
    priceRange: 'Price Range',
    minimumRating: 'Minimum Rating',
    reset: 'Reset',
    applyFilters: 'Apply Filters',
    list: 'List',
    map: 'Map',
    mapViewNotAvailable: 'Map view is not available on web',
    switchToListView: 'Switch to List View',
    noVenuesFound: 'No venues found',
    tryAdjustingSearch: 'Try adjusting your search or filters',
    myBookings: 'My Bookings',
    upcoming: 'Upcoming',
    pending: 'Pending',
    past: 'Past',
    loadingBookings: 'Loading your bookings...',
    loadingBookingDetails: 'Loading booking details...',
    failedLoadBookings: 'Failed to load bookings',
    tryAgain: 'Try Again',
    noBookings: 'No {type} bookings',
    noUpcomingBookings: "You don't have any upcoming bookings. Start exploring venues to make your first booking!",
    noPendingBookings: "You don't have any pending reservations right now.",
    noPastBookings: "You don't have any past bookings yet.",
    exploreVenues: 'Explore Venues',
    bookingDetails: 'Booking Details',
    bookingInformation: 'Booking Information',
    date: 'Date',
    time: 'Time',
    totalAmount: 'Total Amount',
    cancelBooking: 'Cancel Booking',
    contactVenueOwner: 'Contact Venue Owner',
    bookingsUnknownError: 'Booking not found',
    savedAddressesTitle: 'Saved Addresses',
    homeLabel: 'Home',
    noSavedAddresses: 'No saved addresses',
    addAddress: 'Add Address',
    about: 'About',
    amenities: 'Amenities',
    location: 'Location',
    viewOnMap: 'View on Map',
    booking: 'Booking',
    selectSport: 'Select Sport',
    selectDate: 'Select Date',
    daySlots: 'Day Slots:',
    nightSlots: 'Night Slots:',
    duration: 'Duration:',
    pleaseSelectSport: 'Please select a sport to view available time slots',
    loadingAvailableSlots: 'Loading available slots...',
    noTimeSlotsAvailable: 'No time slots available for selected date and court',
    reviews: 'Reviews',
    writeReview: 'Write a Review',
    shareYourExperience: 'Share your experience...',
    submitReview: 'Submit Review',
    loadingReviews: 'Loading reviews...',
    noReviewsYet: 'No reviews yet',
    beFirstReview: 'Be the first to share your experience',
    viewMore: 'View more',
    viewLess: 'View less',
    pricePerHour: '/hour',
    thankYouReading: 'Thank you for reading! For more information, visit',
    goBack: 'Go Back',
    oops: 'Oops!',
    screenDoesNotExist: "This screen doesn't exist.",
    goToHomeScreen: 'Go to home screen!',
    loginRequired: 'Login Required',
    enterYourFullName: 'Enter your full name',
    enterYourEmail: 'Enter your email',
    enterYourPhoneNumber: 'Enter your phone number',
    enterYourAddress: 'Enter your address',
    saveChanges: 'Save Changes',
    profileUpdated: 'Profile updated successfully!',
    profilePicture: 'Profile Picture',
    enterNameLabel: 'Full Name',
    enterEmailLabel: 'Email Address',
    enterPhoneLabel: 'Phone Number',
    enterAddressLabel: 'Address',
    continueWithEmail: 'Continue with Email',
    continueWithPhone: 'Continue with Phone',
    loginTagline: 'Welcome back! Login or signup using your email or phone.',
    registerTagline: 'Create your account quickly with phone verification.',
    enterVerificationCode: 'Enter Verification Code',
    enterOTPPlaceholder: 'Enter 6-digit OTP',
    invalidInput: 'Please enter a valid {field}.',
    invalidEmailOrPhone: 'Please enter a valid email or phone number.',
    failedToSendOtp: 'Failed to send OTP. Please try again.',
    otpVerificationFailed: 'OTP verification failed. Please try again.',
    dontHaveAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    resendOtpTimer: 'Resend OTP in {seconds} seconds',
    registrationFailed: 'Registration failed. Please try again.',
    emailAddress: 'Email address',
    phoneNumber: 'Phone number',
    continue: 'Continue',
    verifyAndContinue: 'Verify & Continue',
    resendOTP: 'Resend OTP',
    sendOTP: 'Send OTP',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    loginLink: 'Login',
    registerWithPhone: 'login/signup with Phone',
    invalidEmail: 'Invalid email address',
    invalidPhoneNumber: 'Invalid phone number',
    invalidOTP: 'Please enter a valid 6-digit OTP',
    otpSentMessage: "We've sent a 6-digit code to your {method}",
    termsAndConditions: 'By proceeding, you agree to our terms and conditions',
    limitReached: 'Limit reached',
    limitReachedMessage: 'You can book up to {max} time slots.',
    unableToShare: 'Unable to share',
    venueLinkNotAvailable: 'Venue link is not available yet.',
    pleaseLogInToBookVenue: 'Please log in to book this venue',
    errorSelectTimeSlots: 'Please select time slots to continue',
    pleaseLogInToSubmitReview: 'Please log in to submit a review',
    ratingRequired: 'Rating Required',
    selectRating: 'Please select a rating',
    ratingPoor: 'Poor',
    ratingFair: 'Fair',
    ratingGood: 'Good',
    ratingVeryGood: 'Very Good',
    ratingExcellent: 'Excellent',
    reviewRequired: 'Review Required',
    reviewSubmittedSuccess: 'Review submitted successfully',
    failedSubmitReview: 'Failed to submit review',
    durationPerSlot: 'Duration per slot:',
    slotDuration: '{minutes} minutes',
    numberOfSlots: 'Number of Slots:',
    showMore: 'Show More',
    showLess: 'Show Less',
    price: 'Price',
    total: 'Total',
    bookNow: 'Book Now',
    bookSlots: '{count} Slots',
    confirmYourBooking: 'Confirm Your Booking',
    reviewYourBookingDetails: 'Review your booking details',
    dateTime: 'Date & Time',
    paymentSummary: 'Payment Summary',
    pay: 'Pay',
    payAmount: 'Pay ₹{amount}',
    paymentCancelled: 'Payment Cancelled',
    paymentCancelledMessage: 'You cancelled the payment.',
    paymentFailed: 'Payment Failed',
    paymentFailedMessage: 'Something went wrong. Please try again.',
    loginToCompleteBooking: 'Please login to complete booking',
    unknownVenue: 'Unknown Venue',
    court: 'Court',
    service: 'Service',
    cancel: 'Cancel',
    logoutConfirm: 'Are you sure you want to logout?',
    failedLogout: 'Failed to logout. Please try again.',
    couldNotOpenLink: 'Could not open the link at this time.',
    comingSoon: 'Coming Soon',
    venueManagementComingSoon: 'Venue management will be available soon',
    share: 'Share',
    sharingFunctionality: 'Sharing functionality would be implemented here',
    cancelBookingConfirm: 'Are you sure you want to cancel this booking?',
    yesCancel: 'Yes, Cancel',
    blogNotFound: 'Blog not found',
    failedLoadBlog: 'Failed to load blog',
    shareBookingMessage: 'Sharing functionality would be implemented here',
    shareBlogMessage: 'Sharing functionality would be implemented here',
    venueNotFound: 'Venue not found',
    reviewMessageRequired: 'Please write a review message',
    statusConfirmed: 'Confirmed',
    statusPending: 'Pending',
    statusCancelled: 'Cancelled',
    bookingId: 'Booking ID: #{id}',
    selectTimeSlots: 'Select Time Slots',
    selectedSlotsCount: '({count} selected)',
    no: 'No',
    yes: 'Yes',
  },
  hi: {
    profile: 'प्रोफ़ाइल',
    notLoggedInTitle: 'आप लॉग इन नहीं हैं',
    notLoggedInText: 'अपनी प्रोफ़ाइल देखने के लिए कृपया लॉग इन करें',
    goToLogin: 'लॉगिन पर जाएँ',
    savedAddresses: 'सहेजे गए पते',
    notifications: 'सूचनाएँ',
    privacySecurity: 'गोपनीयता और सुरक्षा',
    helpSupport: 'सहायता और समर्थन',
    myVenues: 'मेरे स्थान',
    editProfile: 'प्रोफ़ाइल संपादित करें',
    logout: 'लॉग आउट',
    version: 'संस्करण 1.0.0',
    latestBlogs: 'नवीनतम ब्लॉग',
    seeAll: 'सभी देखें',
    noBlogsAvailable: 'कोई ब्लॉग उपलब्ध नहीं है',
    venueOwner: 'स्थल स्वामी',
    language: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिन्दी',
    selectLanguage: 'अपनी भाषा चुनें',
    languageUpdated: 'भाषा अपडेट की गई',
    welcome: 'स्वागत है',
    hello: 'नमस्ते, {name}',
    exploreVenuesNearYou: 'अपने पास के स्थान देखें',
    login: 'लॉग इन',
    searchVenues: 'स्थान खोजें...',
    bannerTitle: 'अपना आदर्श स्थल बुक करें',
    bannerSubtitle: 'पहली बुकिंग पर 15% की छूट पाएं',
    explore: 'खोजें',
    featuredVenues: 'विशेष स्थान',
    noCategoryVenuesFound: 'कोई {category} स्थल नहीं मिला',
    categories: 'श्रेणियाँ',
    nearbyVenues: 'पास के स्थान',
    noCategoryVenuesNearby: 'कोई {category} स्थल पास में नहीं मिला',
    filterVenues: 'स्थलों को फ़िल्टर करें',
    sportType: 'खेल प्रकार',
    priceRange: 'मूल्य सीमा',
    minimumRating: 'न्यूनतम रेटिंग',
    reset: 'रीसेट',
    applyFilters: 'फ़िल्टर लागू करें',
    list: 'सूची',
    map: 'मैप',
    mapViewNotAvailable: 'वेब पर मैप दृश्य उपलब्ध नहीं है',
    switchToListView: 'सूची दृश्य पर स्विच करें',
    noVenuesFound: 'कोई स्थल नहीं मिला',
    tryAdjustingSearch: 'कृपया खोज या फ़िल्टर समायोजित करें',
    myBookings: 'मेरी बुकिंग',
    upcoming: 'आगामी',
    pending: 'रिज़र्वेशन',
    past: 'पुराना',
    loadingBookings: 'आपकी बुकिंग लोड हो रही है...',
    loadingBookingDetails: 'बुकिंग विवरण लोड हो रहा है...',
    failedLoadBookings: 'बुकिंग लोड करने में विफल',
    tryAgain: 'पुनः प्रयास करें',
    noBookings: '{type} बुकिंग नहीं मिली',
    noUpcomingBookings: 'आपके पास कोई आगामी बुकिंग नहीं है। अपनी पहली बुकिंग करने के लिए स्थल देखें!',
    noPendingBookings: 'आपके पास अभी कोई लंबित आरक्षण नहीं हैं।',
    noPastBookings: 'आपके पास अभी कोई पुरानी बुकिंग नहीं है।',
    exploreVenues: 'स्थल देखें',
    bookingDetails: 'बुकिंग विवरण',
    bookingInformation: 'बुकिंग जानकारी',
    date: 'तारीख',
    time: 'समय',
    totalAmount: 'कुल राशि',
    cancelBooking: 'बुकिंग रद्द करें',
    contactVenueOwner: 'स्थान मालिक से संपर्क करें',
    bookingsUnknownError: 'बुकिंग नहीं मिली',
    savedAddressesTitle: 'सहेजे गए पते',
    homeLabel: 'होम',
    noSavedAddresses: 'कोई सहेजा गया पता नहीं',
    addAddress: 'पता जोड़ें',
    about: 'के बारे में',
    amenities: 'सुविधाएँ',
    location: 'स्थान',
    viewOnMap: 'मैप पर देखें',
    booking: 'बुकिंग',
    selectSport: 'खेल चुनें',
    selectDate: 'तिथि चुनें',
    daySlots: 'दिन स्लॉट:',
    nightSlots: 'रात स्लॉट:',
    duration: 'अवधि:',
    pleaseSelectSport: 'उपलब्ध समय स्लॉट देखने के लिए कृपया एक खेल चुनें',
    loadingAvailableSlots: 'उपलब्ध स्लॉट लोड हो रहे हैं...',
    noTimeSlotsAvailable: 'चयनित तारीख और कोर्ट के लिए कोई समय स्लॉट उपलब्ध नहीं हैं',
    reviews: 'समीक्षाएँ',
    writeReview: 'एक समीक्षा लिखें',
    shareYourExperience: 'अपना अनुभव साझा करें...',
    submitReview: 'समीक्षा सबमिट करें',
    loadingReviews: 'समीक्षाएँ लोड हो रही हैं...',
    noReviewsYet: 'अभी कोई समीक्षा नहीं',
    beFirstReview: 'अपना अनुभव साझा करने वाले पहले बनें',
    viewMore: 'और देखें',
    viewLess: 'कम देखें',
    pricePerHour: '/घंटा',
    thankYouReading: 'पढ़ने के लिए धन्यवाद! अधिक जानकारी के लिए देखें',
    goBack: 'वापस जाएँ',
    oops: 'उफ़!',
    screenDoesNotExist: 'यह स्क्रीन मौजूद नहीं है।',
    goToHomeScreen: 'होम स्क्रीन पर जाएँ!',
    loginRequired: 'लॉगिन आवश्यक है',
    enterYourFullName: 'अपना पूरा नाम दर्ज करें',
    enterYourEmail: 'अपना ईमेल दर्ज करें',
    enterYourPhoneNumber: 'अपना फोन नंबर दर्ज करें',
    enterYourAddress: 'अपना पता दर्ज करें',
    saveChanges: 'परिवर्तनों को सहेजें',
    profileUpdated: 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई!',
    profilePicture: 'प्रोफ़ाइल चित्र',
    enterNameLabel: 'पूरा नाम',
    enterEmailLabel: 'ईमेल पता',
    enterPhoneLabel: 'फोन नंबर',
    enterAddressLabel: 'पता',
    continueWithEmail: 'ईमेल के साथ जारी रखें',
    continueWithPhone: 'फोन के साथ जारी रखें',
    loginTagline: 'वापसी पर स्वागत है! अपना ईमेल या फोन का उपयोग करके लॉगिन या साइनअप करें।',
    registerTagline: 'फोन सत्यापन के साथ अपना खाता जल्दी बनाएं।',
    enterVerificationCode: 'सत्यापन कोड दर्ज करें',
    enterOTPPlaceholder: '6-अंकीय OTP दर्ज करें',
    invalidInput: 'कृपया एक मान्य {field} दर्ज करें।',
    invalidEmailOrPhone: 'कृपया एक मान्य ईमेल या फोन नंबर दर्ज करें।',
    failedToSendOtp: 'OTP भेजने में विफल। कृपया पुनः प्रयास करें।',
    otpVerificationFailed: 'OTP सत्यापन विफल। कृपया पुनः प्रयास करें।',
    dontHaveAccount: 'क्या आपके पास खाता नहीं है?',
    signUpLink: 'साइन अप करें',
    resendOtpTimer: '{seconds} सेकंड में OTP पुनः भेजें',
    registrationFailed: 'पंजीकरण विफल। कृपया पुनः प्रयास करें।',
    emailAddress: 'ईमेल पता',
    phoneNumber: 'फोन नंबर',
    continue: 'जारी रखें',
    verifyAndContinue: 'सत्यापित करें और जारी रखें',
    resendOTP: 'OTP पुनः भेजें',
    sendOTP: 'OTP भेजें',
    createAccount: 'खाता बनाएं',
    alreadyHaveAccount: 'पहले से ही आपका एक खाता है?',
    loginLink: 'लॉगिन',
    registerWithPhone: 'फोन के साथ लॉगिन/साइनअप',
    invalidEmail: 'अमान्य ईमेल पता',
    invalidPhoneNumber: 'अमान्य फ़ोन नंबर',
    invalidOTP: 'कृपया मान्य 6-अंकीय OTP दर्ज करें',
    otpSentMessage: 'हमने आपके {method} पर 6-अंकीय कोड भेजा है',
    termsAndConditions: 'आगे बढ़ने पर, आप हमारी नियम और शर्तों से सहमत होते हैं',
    limitReached: 'सीमा तक पहुँचा',
    limitReachedMessage: 'आप {max} समय स्लॉट तक बुक कर सकते हैं।',
    unableToShare: 'साझा करने में असमर्थ',
    venueLinkNotAvailable: 'स्थान लिंक अभी उपलब्ध नहीं है।',
    pleaseLogInToBookVenue: 'इस स्थल की बुकिंग करने के लिए कृपया लॉग इन करें',
    errorSelectTimeSlots: 'जारी रखने के लिए कृपया समय स्लॉट चुनें',
    pleaseLogInToSubmitReview: 'समीक्षा सबमिट करने के लिए कृपया लॉग इन करें',
    ratingRequired: 'रेटिंग आवश्यक है',
    selectRating: 'कृपया एक रेटिंग चुनें',
    ratingPoor: 'ख़राब',
    ratingFair: 'ठीक',
    ratingGood: 'अच्छा',
    ratingVeryGood: 'बहुत अच्छा',
    ratingExcellent: 'उत्कृष्ट',
    reviewRequired: 'समीक्षा आवश्यक है',
    reviewSubmittedSuccess: 'समीक्षा सफलतापूर्वक सबमिट की गई',
    failedSubmitReview: 'समीक्षा सबमिट करने में विफल',
    durationPerSlot: 'प्रति स्लॉट अवधि:',
    slotDuration: '{minutes} मिनट',
    numberOfSlots: 'स्लॉट की संख्या:',
    showMore: 'और देखें',
    showLess: 'कम देखें',
    price: 'मूल्य',
    total: 'कुल',
    bookNow: 'अब बुक करें',
    bookSlots: '{count} स्लॉट',
    confirmYourBooking: 'अपनी बुकिंग की पुष्टि करें',
    reviewYourBookingDetails: 'अपनी बुकिंग विवरण की समीक्षा करें',
    dateTime: 'तारीख और समय',
    paymentSummary: 'भुगतान सारांश',
    pay: 'भुगतान करें',
    payAmount: '₹{amount} का भुगतान करें',
    paymentCancelled: 'भुगतान रद्द किया गया',
    paymentCancelledMessage: 'आपने भुगतान रद्द कर दिया।',
    paymentFailed: 'भुगतान विफल',
    paymentFailedMessage: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
    loginToCompleteBooking: 'बुकिंग पूरी करने के लिए कृपया लॉग इन करें',
    unknownVenue: 'अज्ञात स्थल',
    court: 'कोर्ट',
    service: 'सेवा',
    cancel: 'रद्द करें',
    logoutConfirm: 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
    failedLogout: 'लॉग आउट करने में विफल। कृपया पुनः प्रयास करें।',
    couldNotOpenLink: 'इस समय लिंक खोलने में असमर्थ।',
    comingSoon: 'जल्द आ रहा है',
    venueManagementComingSoon: 'स्थान प्रबंधन जल्द ही उपलब्ध होगा',
    share: 'साझा करें',
    sharingFunctionality: 'साझा करने की कार्यक्षमता यहां लागू की जाएगी',
    cancelBookingConfirm: 'क्या आप वाकई इस बुकिंग को रद्द करना चाहते हैं?',
    yesCancel: 'हाँ, रद्द करें',
    blogNotFound: 'ब्लॉग नहीं मिला',
    failedLoadBlog: 'ब्लॉग लोड करने में विफल',
    shareBookingMessage: 'साझा करने की कार्यक्षमता यहां लागू की जाएगी',
    shareBlogMessage: 'साझा करने की कार्यक्षमता यहां लागू की जाएगी',
    venueNotFound: 'स्थान नहीं मिला',
    reviewMessageRequired: 'कृपया समीक्षा संदेश लिखें',
    statusConfirmed: 'पुष्ट',
    statusPending: 'प्रतीक्षारत',
    statusCancelled: 'रद्द किया गया',
    bookingId: 'बुकिंग आईडी: #{id}',
    selectTimeSlots: 'समय स्लॉट चुनें',
    selectedSlotsCount: '({count} चुने गए)',
    no: 'नहीं',
    yes: 'हाँ',
  },
};

const LANGUAGE_STORAGE_KEY = '@bookvenue_language';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKeys, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const interpolate = (text: string, params?: TranslationParams) => {
  if (!params) return text;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\{${key}\}`, 'g'), String(value)),
    text,
  );
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const restoreLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLanguage === 'en' || storedLanguage === 'hi') {
          setLanguageState(storedLanguage);
        }
      } catch (error) {
        console.warn('Unable to restore language preference', error);
      }
    };

    restoreLanguage();
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    try {
      setLanguageState(nextLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.warn('Unable to save language preference', error);
    }
  };

  const t = (key: TranslationKeys, params?: TranslationParams) => {
    const text = translations[language][key] ?? translations.en[key] ?? key;
    return interpolate(text, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
