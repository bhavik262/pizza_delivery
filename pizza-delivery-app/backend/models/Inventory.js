const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add item name'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Please add category'],
    enum: ['base', 'sauce', 'cheese', 'vegetable', 'meat', 'other']
  },
  currentStock: {
    type: Number,
    required: [true, 'Please add current stock'],
    min: [0, 'Stock cannot be negative']
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Please add minimum stock level'],
    min: [1, 'Minimum stock level must be at least 1']
  },
  maxStockLevel: {
    type: Number,
    required: [true, 'Please add maximum stock level']
  },
  unit: {
    type: String,
    required: [true, 'Please add unit'],
    enum: ['kg', 'grams', 'liters', 'ml', 'pieces', 'packets']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Please add price per unit'],
    min: [0, 'Price cannot be negative']
  },
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lowStockAlertSent: {
    type: Boolean,
    default: false
  },
  stockHistory: [{
    action: {
      type: String,
      enum: ['restock', 'consumption', 'wastage', 'adjustment'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    reason: String,
    performedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    orderId: String // If consumption is due to an order
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validate that maxStockLevel is greater than minStockLevel
inventoryItemSchema.pre('save', function(next) {
  if (this.maxStockLevel <= this.minStockLevel) {
    next(new Error('Maximum stock level must be greater than minimum stock level'));
  }
  
  this.updatedAt = Date.now();
  next();
});

// Check if stock is low
inventoryItemSchema.methods.isLowStock = function() {
  return this.currentStock <= this.minStockLevel;
};

// Check if stock is critically low (less than half of minimum)
inventoryItemSchema.methods.isCriticallyLowStock = function() {
  return this.currentStock <= (this.minStockLevel / 2);
};

// Update stock with history tracking
inventoryItemSchema.methods.updateStock = function(action, quantity, reason, performedBy, orderId = null) {
  const previousStock = this.currentStock;
  
  switch (action) {
    case 'restock':
      this.currentStock += quantity;
      this.lastRestocked = new Date();
      this.lowStockAlertSent = false; // Reset alert flag when restocked
      break;
    case 'consumption':
    case 'wastage':
      this.currentStock -= quantity;
      break;
    case 'adjustment':
      this.currentStock = quantity; // Direct adjustment to specific value
      break;
    default:
      throw new Error('Invalid stock action');
  }
  
  // Ensure stock doesn't go negative
  if (this.currentStock < 0) {
    this.currentStock = 0;
  }
  
  // Add to stock history
  this.stockHistory.push({
    action,
    quantity: Math.abs(quantity),
    previousStock,
    newStock: this.currentStock,
    reason,
    performedBy,
    orderId
  });
  
  return this.save();
};

// Get stock status
inventoryItemSchema.methods.getStockStatus = function() {
  if (this.isCriticallyLowStock()) {
    return 'critical';
  } else if (this.isLowStock()) {
    return 'low';
  } else if (this.currentStock >= this.maxStockLevel) {
    return 'overstocked';
  } else {
    return 'normal';
  }
};

// Calculate stock value
inventoryItemSchema.methods.getStockValue = function() {
  return this.currentStock * this.pricePerUnit;
};

// Get consumption rate (items consumed per day over last 30 days)
inventoryItemSchema.methods.getConsumptionRate = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const consumptionHistory = this.stockHistory.filter(entry => 
    entry.action === 'consumption' && 
    entry.timestamp >= thirtyDaysAgo
  );
  
  const totalConsumed = consumptionHistory.reduce((total, entry) => total + entry.quantity, 0);
  return totalConsumed / 30; // per day average
};

// Predict when stock will run out based on consumption rate
inventoryItemSchema.methods.predictStockOutDate = function() {
  const consumptionRate = this.getConsumptionRate();
  
  if (consumptionRate <= 0) {
    return null; // No consumption data
  }
  
  const daysUntilStockOut = this.currentStock / consumptionRate;
  const stockOutDate = new Date(Date.now() + daysUntilStockOut * 24 * 60 * 60 * 1000);
  
  return stockOutDate;
};

// Static method to get all low stock items
inventoryItemSchema.statics.getLowStockItems = function() {
  return this.find({
    $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    isActive: true
  });
};

// Static method to get items that need restocking alerts
inventoryItemSchema.statics.getItemsNeedingAlerts = function() {
  return this.find({
    $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    isActive: true,
    lowStockAlertSent: false
  });
};

// Index for efficient queries
inventoryItemSchema.index({ category: 1, isActive: 1 });
inventoryItemSchema.index({ currentStock: 1, minStockLevel: 1 });
inventoryItemSchema.index({ name: 'text' });

module.exports = mongoose.model('Inventory', inventoryItemSchema);