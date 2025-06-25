import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Plus, Trash2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, IndianRupee, Calendar, Clock } from 'lucide-react-native';
import { RazorpayService } from '@/utils/razorpay';

type PaymentMethod = {
  id: string;
  type: 'card' | 'upi' | 'wallet';
  last4?: string;
  brand?: string;
  upiId?: string;
  walletName?: string;
  isDefault: boolean;
};

type Transaction = {
  id: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  date: string;
  description: string;
  paymentMethod: string;
};

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'methods' | 'history'>('methods');

  useEffect(() => {
    // Mock data for demonstration
    setPaymentMethods([
      {
        id: '1',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        isDefault: true,
      },
      {
        id: '2',
        type: 'upi',
        upiId: 'user@paytm',
        isDefault: false,
      },
    ]);

    setTransactions([
      {
        id: '1',
        amount: 1500,
        status: 'success',
        date: '2024-01-15',
        description: 'Cricket Turf Booking - Gorilla Cage',
        paymentMethod: 'Visa ****4242',
      },
      {
        id: '2',
        amount: 2000,
        status: 'success',
        date: '2024-01-10',
        description: 'Football Ground Booking - Sports Arena',
        paymentMethod: 'UPI - user@paytm',
      },
      {
        id: '3',
        amount: 1200,
        status: 'failed',
        date: '2024-01-08',
        description: 'Tennis Court Booking - Elite Club',
        paymentMethod: 'Visa ****4242',
      },
    ]);
  }, []);

  const handleAddPaymentMethod = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to add payment methods');
      return;
    }

    try {
      setLoading(true);

      // Create a test payment to add payment method
      const paymentOptions = RazorpayService.createPaymentOptions(
        1, // ₹1 for adding payment method
        `add_method_${Date.now()}`,
        {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        {
          venueName: 'Payment Method',
          courtName: 'Setup',
          date: new Date().toISOString().split('T')[0],
          slots: 1
        }
      );

      const response = await RazorpayService.openCheckout(paymentOptions);
      
      // In a real app, you would save the payment method details
      Alert.alert('Success', 'Payment method added successfully!');
      
    } catch (error: any) {
      if (error.message !== 'Payment cancelled by user') {
        Alert.alert('Error', 'Failed to add payment method');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to test payments');
      return;
    }

    try {
      setLoading(true);

      const paymentOptions = RazorpayService.createPaymentOptions(
        1, // ₹1 test payment
        `test_${Date.now()}`,
        {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        {
          venueName: 'Test Venue',
          courtName: 'Test Court',
          date: new Date().toISOString().split('T')[0],
          slots: 1
        }
      );

      const response = await RazorpayService.openCheckout(paymentOptions);
      
      Alert.alert('Success', `Test payment successful! Payment ID: ${response.razorpay_payment_id}`);
      
      // Add to transaction history
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        amount: 1,
        status: 'success',
        date: new Date().toISOString().split('T')[0],
        description: 'Test Payment',
        paymentMethod: 'Razorpay',
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      
    } catch (error: any) {
      if (error.message !== 'Payment cancelled by user') {
        Alert.alert('Error', 'Test payment failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const removePaymentMethod = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(prev => prev.filter(method => method.id !== id));
          },
        },
      ]
    );
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return <CreditCard size={20} color="#2563EB" />;
      case 'upi':
        return <IndianRupee size={20} color="#10B981" />;
      case 'wallet':
        return <IndianRupee size={20} color="#F59E0B" />;
      default:
        return <CreditCard size={20} color="#6B7280" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} color="#10B981" />;
      case 'failed':
        return <AlertCircle size={16} color="#EF4444" />;
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      default:
        return <AlertCircle size={16} color="#6B7280" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return styles.statusSuccess;
      case 'failed':
        return styles.statusFailed;
      case 'pending':
        return styles.statusPending;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'methods' && styles.activeTab]}
          onPress={() => setActiveTab('methods')}
        >
          <Text style={[styles.tabText, activeTab === 'methods' && styles.activeTabText]}>
            Payment Methods
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Transaction History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'methods' ? (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddPaymentMethod}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Plus size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            </View>

            {paymentMethods.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CreditCard size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No payment methods</Text>
                <Text style={styles.emptyDescription}>
                  Add a payment method to make bookings easier
                </Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
                <View key={method.id} style={styles.paymentMethodCard}>
                  <View style={styles.paymentMethodInfo}>
                    {getPaymentMethodIcon(method)}
                    <View style={styles.paymentMethodDetails}>
                      <Text style={styles.paymentMethodTitle}>
                        {method.type === 'card' 
                          ? `${method.brand} ****${method.last4}`
                          : method.type === 'upi'
                          ? method.upiId
                          : method.walletName
                        }
                      </Text>
                      {method.isDefault && (
                        <Text style={styles.defaultLabel}>Default</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removePaymentMethod(method.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.testSection}>
              <Text style={styles.sectionTitle}>Test Razorpay Integration</Text>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={handleTestPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <IndianRupee size={20} color="#FFFFFF" />
                    <Text style={styles.testButtonText}>Test Payment (₹1)</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.testDescription}>
                This will open Razorpay checkout for a test payment of ₹1
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Calendar size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No transactions</Text>
                <Text style={styles.emptyDescription}>
                  Your payment history will appear here
                </Text>
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={styles.transactionMethod}>
                        {transaction.paymentMethod}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>
                        ₹{transaction.amount}
                      </Text>
                      <View style={[styles.statusContainer, getStatusStyle(transaction.status)]}>
                        {getStatusIcon(transaction.status)}
                        <Text style={styles.statusText}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  defaultLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  removeButton: {
    padding: 8,
  },
  testSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  testButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  testDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionMethod: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusFailed: {
    backgroundColor: '#FEF2F2',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusDefault: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginLeft: 4,
    color: '#1F2937',
  },
});