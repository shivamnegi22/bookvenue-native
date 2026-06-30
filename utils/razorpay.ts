import { Platform } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, any>;
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export class RazorpayService {
  private static apiKey = 'rzp_live_qyWsOEPEllNahd';

  private static getErrorPayloads(error: any): any[] {
    const payloads = [error, error?.error].filter(Boolean);
    const message = typeof error?.message === 'string' ? error.message : '';
    const jsonText = message.startsWith('Payment failed:')
      ? message.replace('Payment failed:', '').trim()
      : message.trim();

    if (jsonText.startsWith('{')) {
      try {
        const parsed = JSON.parse(jsonText);
        payloads.push(parsed, parsed?.error);
      } catch {
        // Keep the original SDK error if the message is not JSON.
      }
    }

    return payloads.filter(Boolean);
  }

  private static isPaymentCancelled(error: any): boolean {
    const payloads = this.getErrorPayloads(error);
    const text = payloads
      .flatMap((payload) => [
        payload?.code,
        payload?.description,
        payload?.message,
        payload?.reason,
        payload?.step,
        payload?.source,
      ])
      .filter((value) => value !== undefined && value !== null)
      .join(' ')
      .toLowerCase();

    if (text.includes('cancel')) {
      return true;
    }

    return payloads.some((payload) => {
      const description = String(payload?.description ?? '').toLowerCase();
      return (
        payload?.source === 'customer' &&
        payload?.step === 'payment_authentication' &&
        payload?.reason === 'payment_error' &&
        (!payload?.description || description === 'undefined')
      );
    });
  }

  static isCancelledPaymentError(error: any): boolean {
    return this.isPaymentCancelled(error);
  }

  static async openCheckout(options: RazorpayOptions): Promise<RazorpayResponse> {
    if (Platform.OS === 'web') {
      return this.openWebCheckout(options);
    } else {
      return this.openNativeCheckout(options);
    }
  }

  private static async openWebCheckout(options: RazorpayOptions): Promise<RazorpayResponse> {
    return new Promise((resolve, reject) => {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => this.initializeWebPayment(options, resolve, reject);
        script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.body.appendChild(script);
      } else {
        this.initializeWebPayment(options, resolve, reject);
      }
    });
  }

  private static initializeWebPayment(
    options: RazorpayOptions,
    resolve: (value: RazorpayResponse) => void,
    reject: (reason: any) => void
  ) {
    const rzp = new window.Razorpay({
      ...options,
      handler: function (response: RazorpayResponse) {
        console.log('Razorpay payment successful:', response);
        resolve(response);
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay payment dismissed');
          reject(new Error('Payment cancelled by user'));
        }
      }
    });
    
    rzp.on('payment.failed', function (response: any) {
      console.log('Razorpay payment failed:', response);
      if (RazorpayService.isPaymentCancelled(response)) {
        reject(new Error('Payment cancelled by user'));
        return;
      }
      reject(new Error(`Payment failed: ${response.error.description}`));
    });
    
    rzp.open();
  }

  private static async openNativeCheckout(options: RazorpayOptions): Promise<RazorpayResponse> {
    try {
      console.log('Opening native Razorpay checkout with options:', options);
      
      const data = await RazorpayCheckout.open({
        ...options,
        key: this.apiKey,
      });
      
      console.log('Native Razorpay payment successful:', data);
      return data;
    } catch (error: any) {
      console.log('Native Razorpay payment error:', error);
      
      if (this.isPaymentCancelled(error)) {
        throw new Error('Payment cancelled by user');
      }
      
      if (error.description) {
        throw new Error(`Payment failed: ${error.description}`);
      }
      
      throw new Error(`Payment failed: ${error.message || 'Unknown error'}`);
    }
  }

  static createPaymentOptions(
    amount: number,
    orderId: string,
    userDetails: {
      name: string;
      email: string;
      contact: string;
    },
    bookingDetails: {
      venueName: string;
      courtName: string;
      date: string;
      slots: number;
    }
  ): RazorpayOptions {
    // Ensure contact number is properly formatted
    let contact = userDetails.contact;
    if (contact && !contact.startsWith('+91')) {
      // Remove any non-digit characters
      contact = contact.replace(/\D/g, '');
      // Add country code if not present
      if (contact.length === 10) {
        contact = `+91${contact}`;
      }
    }

    const description = bookingDetails.slots > 1 
      ? `${bookingDetails.slots} slots at ${bookingDetails.venueName}`
      : `${bookingDetails.courtName} at ${bookingDetails.venueName}`;

    return {
      key: this.apiKey,
      amount: Math.round(amount), // Convert to paise and ensure integer
      currency: 'INR',
      name: 'BookVenue',
      description: description,
      order_id: orderId,
      image: 'https://images.pexels.com/photos/3775042/pexels-photo-3775042.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
      prefill: {
        name: userDetails.name,
        email: userDetails.email,
        contact: contact
      },
      notes: {
        venue_name: bookingDetails.venueName,
        court_name: bookingDetails.courtName,
        booking_date: bookingDetails.date,
        total_slots: bookingDetails.slots.toString(),
        order_id: orderId,
        platform: Platform.OS
      },
      theme: {
        color: '#15aa9b'
      }
    };
  }
}

// Declare global Razorpay for web
declare global {
  interface Window {
    Razorpay: any;
  }
}
