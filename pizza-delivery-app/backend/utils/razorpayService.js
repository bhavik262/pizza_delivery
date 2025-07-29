const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  // Create Razorpay order
  async createOrder(amount, currency = 'INR', receipt) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency,
        receipt,
        payment_capture: 1 // Auto capture payment
      };

      const order = await this.razorpay.orders.create(options);
      
      console.log('Razorpay order created:', order.id);
      
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error(`Payment order creation failed: ${error.message}`);
    }
  }

  // Verify payment signature
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpaySignature;
      
      console.log('Payment signature verification:', isSignatureValid ? 'SUCCESS' : 'FAILED');
      
      return {
        success: isSignatureValid,
        expectedSignature,
        receivedSignature: razorpaySignature
      };
    } catch (error) {
      console.error('Payment signature verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      return {
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount / 100, // Convert from paise to rupees
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          captured: payment.captured,
          created_at: payment.created_at,
          order_id: payment.order_id,
          email: payment.email,
          contact: payment.contact
        }
      };
    } catch (error) {
      console.error('Get payment details error:', error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  // Get order details
  async getOrderDetails(orderId) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      
      return {
        success: true,
        order: {
          id: order.id,
          amount: order.amount / 100, // Convert from paise to rupees
          currency: order.currency,
          status: order.status,
          receipt: order.receipt,
          created_at: order.created_at,
          amount_paid: order.amount_paid / 100,
          amount_due: order.amount_due / 100,
          attempts: order.attempts
        }
      };
    } catch (error) {
      console.error('Get order details error:', error);
      throw new Error(`Failed to fetch order details: ${error.message}`);
    }
  }

  // Capture payment (if auto-capture is disabled)
  async capturePayment(paymentId, amount) {
    try {
      const capturedPayment = await this.razorpay.payments.capture(
        paymentId,
        Math.round(amount * 100) // Convert to paise
      );
      
      return {
        success: true,
        payment: {
          id: capturedPayment.id,
          amount: capturedPayment.amount / 100,
          status: capturedPayment.status,
          captured: capturedPayment.captured
        }
      };
    } catch (error) {
      console.error('Payment capture error:', error);
      throw new Error(`Payment capture failed: ${error.message}`);
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount = null, reason = 'Order cancelled') {
    try {
      const refundOptions = {
        speed: 'normal'
      };

      if (amount) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);
      
      console.log('Refund initiated:', refund.id);
      
      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          speed: refund.speed,
          created_at: refund.created_at
        }
      };
    } catch (error) {
      console.error('Payment refund error:', error);
      throw new Error(`Payment refund failed: ${error.message}`);
    }
  }

  // Get all payments for an order
  async getOrderPayments(orderId) {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      
      return {
        success: true,
        payments: payments.items.map(payment => ({
          id: payment.id,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          captured: payment.captured,
          created_at: payment.created_at
        }))
      };
    } catch (error) {
      console.error('Get order payments error:', error);
      throw new Error(`Failed to fetch order payments: ${error.message}`);
    }
  }

  // Validate webhook signature
  validateWebhookSignature(body, signature, secret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return false;
    }
  }

  // Generate payment link (for future use)
  async createPaymentLink(amount, description, customerInfo, callbackUrl) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        description,
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone
        },
        notify: {
          sms: true,
          email: true
        },
        reminder_enable: true,
        callback_url: callbackUrl,
        callback_method: 'get'
      };

      const paymentLink = await this.razorpay.paymentLink.create(options);
      
      return {
        success: true,
        paymentLink: {
          id: paymentLink.id,
          short_url: paymentLink.short_url,
          amount: paymentLink.amount / 100,
          status: paymentLink.status,
          created_at: paymentLink.created_at
        }
      };
    } catch (error) {
      console.error('Payment link creation error:', error);
      throw new Error(`Payment link creation failed: ${error.message}`);
    }
  }

  // Check if service is configured properly
  isConfigured() {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  // Get test credentials info
  getTestInfo() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Razorpay credentials not configured'
      };
    }

    return {
      configured: true,
      isTestMode: process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_'),
      keyId: process.env.RAZORPAY_KEY_ID,
      message: process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_') 
        ? 'Running in TEST mode' 
        : 'Running in LIVE mode'
    };
  }
}

module.exports = new RazorpayService();