const mongoose = require('mongoose');

const pizzaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a pizza name'],
    trim: true,
    maxlength: [100, 'Pizza name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  image: {
    type: String,
    default: 'default-pizza.jpg'
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['vegetarian', 'non-vegetarian', 'vegan', 'specialty']
  },
  basePrice: {
    type: Number,
    required: [true, 'Please add a base price'],
    min: [0, 'Price cannot be negative']
  },
  sizes: [{
    size: {
      type: String,
      required: true,
      enum: ['small', 'medium', 'large', 'extra-large']
    },
    priceMultiplier: {
      type: Number,
      required: true,
      min: [0.5, 'Price multiplier must be at least 0.5']
    }
  }],
  isCustomizable: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must can not be more than 5'],
    default: 4.5
  },
  numOfReviews: {
    type: Number,
    default: 0
  },
  preparationTime: {
    type: Number, // in minutes
    required: [true, 'Please add preparation time'],
    min: [10, 'Preparation time must be at least 10 minutes']
  },
  ingredients: [String],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pizza customization options schema
const pizzaOptionsSchema = new mongoose.Schema({
  bases: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  sauces: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  cheeses: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  vegetables: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  meats: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }]
});

// Calculate total price for a customized pizza
pizzaSchema.methods.calculatePrice = function(customizations, size = 'medium') {
  let totalPrice = this.basePrice;
  
  // Apply size multiplier
  const sizeOption = this.sizes.find(s => s.size === size);
  if (sizeOption) {
    totalPrice *= sizeOption.priceMultiplier;
  }
  
  // Add customization costs (would need to fetch from PizzaOptions)
  // This would be handled in the controller with populated data
  
  return totalPrice;
};

// Index for search functionality
pizzaSchema.index({
  name: 'text',
  description: 'text',
  category: 'text'
});

const Pizza = mongoose.model('Pizza', pizzaSchema);
const PizzaOptions = mongoose.model('PizzaOptions', pizzaOptionsSchema);

module.exports = { Pizza, PizzaOptions };