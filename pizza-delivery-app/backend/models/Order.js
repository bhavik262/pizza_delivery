const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  pizza: {
    type: mongoose.Schema.ObjectId,
    ref: 'Pizza',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  size: {
    type: String,
    required: true,
    enum: ['small', 'medium', 'large', 'extra-large']
  },
  customizations: {
    base: {
      name: String,
      price: Number
    },
    sauce: {
      name: String,
      price: Number
    },
    cheese: [{
      name: String,
      price: Number
    }],
    vegetables: [{
      name: String,
      price: Number
    }],
    meats: [{
      name: String,
      price: Number
    }]
  },
  itemPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalItemPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  deliveryAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    landmark: String,
    instructions: String
  },
  contactPhone: {
    type: String,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod'],
    required: true
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 50,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  estimatedDeliveryTime: {
    type: Date,
    required: true
  },
  actualDeliveryTime: Date,
  orderNotes: String,
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique order ID
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderId = `PZ${timestamp.slice(-6)}${randomNum}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Update status history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus') && !this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      notes: `Status updated to ${this.orderStatus}`
    });
  }
  next();
});

// Calculate estimated delivery time
orderSchema.methods.calculateEstimatedDeliveryTime = function() {
  const now = new Date();
  const preparationTime = this.items.reduce((total, item) => {
    return total + (item.pizza.preparationTime || 30);
  }, 0);
  
  // Add 30 minutes for delivery
  const totalTime = Math.max(preparationTime, 30) + 30;
  
  this.estimatedDeliveryTime = new Date(now.getTime() + totalTime * 60000);
  return this.estimatedDeliveryTime;
};

// Get order summary
orderSchema.methods.getOrderSummary = function() {
  return {
    orderId: this.orderId,
    status: this.orderStatus,
    total: this.pricing.total,
    itemCount: this.items.reduce((total, item) => total + item.quantity, 0),
    estimatedDeliveryTime: this.estimatedDeliveryTime,
    createdAt: this.createdAt
  };
};

// Index for efficient queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);