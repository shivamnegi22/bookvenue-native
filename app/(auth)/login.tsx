import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Phone, CircleAlert as AlertCircle, ArrowRight } from 'lucide-react-native';
import { authApi } from '@/api/authApi';

export default function LoginScreen() {
  const { login, user } = useAuth();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOTP] = useState('');
  const [showInput, setShowInput] = useState<'email' | 'phone' | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const getPostLoginRoute = React.useCallback(() => {
    const redirectToParam = params.redirectTo;
    const redirectTo = Array.isArray(redirectToParam) ? redirectToParam[0] : redirectToParam;
    const canRedirect = redirectTo === '/booking/confirm' || redirectTo === '/venue/[id]';

    if (!canRedirect) {
      return '/(tabs)' as const;
    }

    const redirectParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (key === 'redirectTo' || value == null) return;
      redirectParams[key] = Array.isArray(value) ? value[0] : value;
    });

    return {
      pathname: redirectTo,
      params: redirectParams,
    } as const;
  }, [params]);

  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting after login');
      router.replace(getPostLoginRoute() as any);
    }
  }, [user, getPostLoginRoute]);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1 && interval) clearInterval(interval);
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleMethodSelect = (method: 'email' | 'phone') => {
    setShowInput(method);
    setIdentifier('');
    setShowOTP(false);
    setOTP('');
    setError(null);
  };

  const validateInput = () => {
    if (showInput === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    } else {
      return /^[0-9]{10}$/.test(identifier);
    }
  };

  const handleSendOTP = async () => {
    if (!validateInput()) {
      setError(t('invalidInput', { field: showInput === 'email' ? t('emailAddress') : t('phoneNumber') }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (showInput === 'email') {
        await authApi.loginEmail(identifier);
      } else {
        await authApi.login(identifier);
      }
      setShowOTP(true);
      setResendTimer(60);
      console.log('OTP sent successfully');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || t('failedToSendOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const isEmail = showInput === 'email';
    const isMobile = showInput === 'phone';

    const isMobileValid = isMobile && /^[0-9]{10}$/.test(identifier);
    const isEmailValid = isEmail && /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(identifier);
    const isOtpValid = otp !== '' && /^[0-9]{6}$/.test(otp);

    if (!isMobileValid && !isEmailValid) {
      setError(t('invalidEmailOrPhone'));
      return;
    }
    if (!isOtpValid) {
      setError(t('invalidOTP'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      console.log('Starting OTP verification...');
      // Always await verification; on failure the API throws and we do not proceed to login.
      if (isEmailValid) {
        await authApi.verifyOTPEmail(identifier, otp);
      } else {
        await authApi.verifyOTP(identifier, otp);
      }
      console.log('OTP verified successfully, token saved');
      await login();
      console.log('Login completed, navigating after login');
      router.replace(getPostLoginRoute() as any);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || t('otpVerificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/BookVenue_Logo.png')}
              style={styles.logo}
            />
            <Text style={styles.appName}>BookVenue</Text>
            <Text style={styles.tagline}>{t('loginTagline')}</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!showInput && (
            <View style={styles.methodContainer}>
              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => handleMethodSelect('email')}
              >
                <Mail size={24} color="#15aa9b" />
                <Text style={styles.methodButtonText}>{t('continueWithEmail')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => handleMethodSelect('phone')}
              >
                <Phone size={24} color="#15aa9b" />
                <Text style={styles.methodButtonText}>{t('continueWithPhone')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showInput && !showOTP && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {showInput === 'email' ? t('enterYourEmail') : t('enterYourPhoneNumber')}
              </Text>
              <View style={styles.inputWrapper}>
                {showInput === 'phone' && <Text style={styles.countryCode}>+91</Text>}
                <TextInput
                  style={[styles.input, showInput === 'phone' && styles.phoneInput]}
                  placeholder={showInput === 'email' ? t('emailAddress') : t('phoneNumber')}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType={showInput === 'email' ? 'email-address' : 'phone-pad'}
                  autoCapitalize="none"
                  maxLength={showInput === 'phone' ? 10 : undefined}
                />
              </View>
              <TouchableOpacity
                style={[styles.actionButton, !validateInput() && styles.actionButtonDisabled]}
                onPress={handleSendOTP}
                disabled={!validateInput() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>{t('continue')}</Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {showOTP && (
            <View style={styles.otpContainer}>
              <Text style={styles.otpTitle}>{t('enterVerificationCode')}</Text>
              <Text style={styles.otpSubtitle}>
                {t('otpSentMessage', { method: showInput === 'email' ? t('emailAddress') : t('phoneNumber') })}
              </Text>
              <TextInput
                style={styles.otpInput}
                placeholder={t('enterOTPPlaceholder')}
                value={otp}
                onChangeText={setOTP}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.actionButton, otp.length !== 6 && styles.actionButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={otp.length !== 6 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('verifyAndContinue')}</Text>
                )}
              </TouchableOpacity>

              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>
                  {t('resendOtpTimer', { seconds: resendTimer })}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleSendOTP} disabled={loading}>
                  <Text style={styles.resendButtonText}>{t('resendOTP')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('dontHaveAccount')}</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register',
                  params,
                } as any)
              }
            >
              <Text style={styles.registerLink}>{t('signUpLink')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  logoContainer: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logo: { width: 100, height: 100, borderRadius: 20, marginBottom: 16 },
  appName: { fontFamily: 'Inter-Bold', fontSize: 28, color: '#1F2937', marginBottom: 8 },
  tagline: { fontFamily: 'Inter-Regular', fontSize: 16, color: '#6B7280' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#EF4444', marginLeft: 8 },
  methodContainer: { gap: 16 },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  methodButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#1F2937' },
  inputContainer: { gap: 16 },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  countryCode: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#1F2937', marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  phoneInput: { paddingLeft: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15aa9b',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  actionButtonDisabled: { backgroundColor: '#93C5FD' },
  actionButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
  otpContainer: { gap: 16 },
  otpTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  otpSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendTimer: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resendButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#15aa9b',
    textAlign: 'center',
    marginTop: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#6B7280' },
  registerLink: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#15aa9b', marginLeft: 4 },
});
