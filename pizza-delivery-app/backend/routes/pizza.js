const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Pizza, PizzaOptions } = require('../models/Pizza');
const Inventory = require('../models/Inventory');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all pizzas with filtering and pagination
// @route   GET /api/pizza
// @access  Public
router.get('/', [
  query('category')
    .optional()
    .isIn(['vegetarian', 'non-vegetarian', 'vegan', 'specialty'])
    .withMessage('Invalid category'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isAvailable: true };

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Sort options
    let sortOptions = {};
    switch (req.query.sort) {
      case 'price_low':
        sortOptions.basePrice = 1;
        break;
      case 'price_high':
        sortOptions.basePrice = -1;
        break;
      case 'rating':
        sortOptions.rating = -1;
        break;
      case 'popular':
        sortOptions.numOfReviews = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    // Execute query
    const pizzas = await Pizza.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Pizza.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: pizzas.length,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: hasNextPage,
        hasPrev: hasPrevPage,
        totalItems: total
      },
      data: pizzas
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get single pizza by ID
// @route   GET /api/pizza/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found'
      });
    }

    if (!pizza.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Pizza is currently not available'
      });
    }

    res.status(200).json({
      success: true,
      data: pizza
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get pizza customization options
// @route   GET /api/pizza/options/customization
// @access  Public
router.get('/options/customization', async (req, res, next) => {
  try {
    // Get pizza options
    let options = await PizzaOptions.findOne();

    if (!options) {
      // Create default options if none exist
      options = await PizzaOptions.create({
        bases: [
          { name: 'Thin Crust', price: 0, isAvailable: true },
          { name: 'Thick Crust', price: 50, isAvailable: true },
          { name: 'Cheese Burst', price: 100, isAvailable: true },
          { name: 'Whole Wheat', price: 30, isAvailable: true },
          { name: 'Gluten Free', price: 80, isAvailable: true }
        ],
        sauces: [
          { name: 'Tomato Sauce', price: 0, isAvailable: true },
          { name: 'White Sauce', price: 40, isAvailable: true },
          { name: 'Pesto Sauce', price: 60, isAvailable: true },
          { name: 'BBQ Sauce', price: 50, isAvailable: true },
          { name: 'Spicy Sauce', price: 30, isAvailable: true }
        ],
        cheeses: [
          { name: 'Mozzarella', price: 0, isAvailable: true },
          { name: 'Cheddar', price: 40, isAvailable: true },
          { name: 'Parmesan', price: 60, isAvailable: true },
          { name: 'Goat Cheese', price: 80, isAvailable: true },
          { name: 'Vegan Cheese', price: 70, isAvailable: true }
        ],
        vegetables: [
          { name: 'Bell Peppers', price: 30, isAvailable: true },
          { name: 'Mushrooms', price: 40, isAvailable: true },
          { name: 'Onions', price: 20, isAvailable: true },
          { name: 'Tomatoes', price: 25, isAvailable: true },
          { name: 'Olives', price: 35, isAvailable: true },
          { name: 'Spinach', price: 30, isAvailable: true },
          { name: 'Corn', price: 25, isAvailable: true },
          { name: 'Jalapeños', price: 30, isAvailable: true }
        ],
        meats: [
          { name: 'Pepperoni', price: 80, isAvailable: true },
          { name: 'Chicken', price: 100, isAvailable: true },
          { name: 'Sausage', price: 90, isAvailable: true },
          { name: 'Ham', price: 85, isAvailable: true },
          { name: 'Bacon', price: 95, isAvailable: true }
        ]
      });
    }

    // Check inventory availability for each option
    const inventory = await Inventory.find({ isActive: true });
    const inventoryMap = inventory.reduce((acc, item) => {
      acc[item.name.toLowerCase()] = item.currentStock > 0;
      return acc;
    }, {});

    // Update availability based on inventory
    const updateAvailability = (items) => {
      return items.map(item => ({
        ...item.toObject(),
        isAvailable: item.isAvailable && (inventoryMap[item.name.toLowerCase()] !== false)
      }));
    };

    const availableOptions = {
      bases: updateAvailability(options.bases),
      sauces: updateAvailability(options.sauces),
      cheeses: updateAvailability(options.cheeses),
      vegetables: updateAvailability(options.vegetables),
      meats: updateAvailability(options.meats)
    };

    res.status(200).json({
      success: true,
      data: availableOptions
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Calculate pizza price with customizations
// @route   POST /api/pizza/calculate-price
// @access  Public
router.post('/calculate-price', [
  body('pizzaId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid pizza ID is required'),
  body('size')
    .isIn(['small', 'medium', 'large', 'extra-large'])
    .withMessage('Invalid size'),
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('customizations')
    .optional()
    .isObject()
    .withMessage('Customizations must be an object')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { pizzaId, size, quantity, customizations = {} } = req.body;

    // Get pizza
    const pizza = await Pizza.findById(pizzaId);
    if (!pizza || !pizza.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found or not available'
      });
    }

    // Get size multiplier
    const sizeOption = pizza.sizes.find(s => s.size === size);
    if (!sizeOption) {
      return res.status(400).json({
        success: false,
        message: 'Invalid size for this pizza'
      });
    }

    // Start with base price and apply size multiplier
    let itemPrice = pizza.basePrice * sizeOption.priceMultiplier;

    // Get customization options for price calculation
    const options = await PizzaOptions.findOne();
    let customizationCost = 0;

    if (options && customizations) {
      // Add base cost
      if (customizations.base) {
        const baseOption = options.bases.find(b => b.name === customizations.base);
        if (baseOption && baseOption.isAvailable) {
          customizationCost += baseOption.price;
        }
      }

      // Add sauce cost
      if (customizations.sauce) {
        const sauceOption = options.sauces.find(s => s.name === customizations.sauce);
        if (sauceOption && sauceOption.isAvailable) {
          customizationCost += sauceOption.price;
        }
      }

      // Add cheese costs
      if (customizations.cheese && Array.isArray(customizations.cheese)) {
        customizations.cheese.forEach(cheeseName => {
          const cheeseOption = options.cheeses.find(c => c.name === cheeseName);
          if (cheeseOption && cheeseOption.isAvailable) {
            customizationCost += cheeseOption.price;
          }
        });
      }

      // Add vegetable costs
      if (customizations.vegetables && Array.isArray(customizations.vegetables)) {
        customizations.vegetables.forEach(vegName => {
          const vegOption = options.vegetables.find(v => v.name === vegName);
          if (vegOption && vegOption.isAvailable) {
            customizationCost += vegOption.price;
          }
        });
      }

      // Add meat costs
      if (customizations.meats && Array.isArray(customizations.meats)) {
        customizations.meats.forEach(meatName => {
          const meatOption = options.meats.find(m => m.name === meatName);
          if (meatOption && meatOption.isAvailable) {
            customizationCost += meatOption.price;
          }
        });
      }
    }

    // Calculate final prices
    const totalItemPrice = itemPrice + customizationCost;
    const totalPrice = totalItemPrice * quantity;

    res.status(200).json({
      success: true,
      data: {
        pizza: {
          id: pizza._id,
          name: pizza.name,
          basePrice: pizza.basePrice
        },
        size,
        sizeMultiplier: sizeOption.priceMultiplier,
        quantity,
        pricing: {
          basePrice: itemPrice,
          customizationCost,
          itemPrice: totalItemPrice,
          totalPrice
        },
        customizations
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get featured/recommended pizzas
// @route   GET /api/pizza/featured
// @access  Public
router.get('/featured/recommendations', async (req, res, next) => {
  try {
    // Get top-rated pizzas
    const featuredPizzas = await Pizza.find({
      isAvailable: true,
      rating: { $gte: 4.0 }
    })
    .sort({ rating: -1, numOfReviews: -1 })
    .limit(6)
    .select('-__v');

    res.status(200).json({
      success: true,
      count: featuredPizzas.length,
      data: featuredPizzas
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get pizza categories
// @route   GET /api/pizza/categories
// @access  Public
router.get('/categories/list', async (req, res, next) => {
  try {
    const categories = await Pizza.aggregate([
      { $match: { isAvailable: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$basePrice' },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          avgRating: { $round: ['$avgRating', 1] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    next(error);
  }
});

// ADMIN ROUTES

// @desc    Create new pizza
// @route   POST /api/pizza
// @access  Private/Admin
router.post('/', [
  protect,
  authorize('admin'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .isIn(['vegetarian', 'non-vegetarian', 'vegan', 'specialty'])
    .withMessage('Invalid category'),
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('sizes')
    .isArray({ min: 1 })
    .withMessage('At least one size is required'),
  body('preparationTime')
    .isInt({ min: 10 })
    .withMessage('Preparation time must be at least 10 minutes')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const pizza = await Pizza.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Pizza created successfully',
      data: pizza
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update pizza
// @route   PUT /api/pizza/:id
// @access  Private/Admin
router.put('/:id', [
  protect,
  authorize('admin')
], async (req, res, next) => {
  try {
    let pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found'
      });
    }

    pizza = await Pizza.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Pizza updated successfully',
      data: pizza
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete pizza
// @route   DELETE /api/pizza/:id
// @access  Private/Admin
router.delete('/:id', [
  protect,
  authorize('admin')
], async (req, res, next) => {
  try {
    const pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found'
      });
    }

    // Soft delete by setting isAvailable to false
    pizza.isAvailable = false;
    await pizza.save();

    res.status(200).json({
      success: true,
      message: 'Pizza deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update pizza customization options
// @route   PUT /api/pizza/options/customization
// @access  Private/Admin
router.put('/options/customization', [
  protect,
  authorize('admin')
], async (req, res, next) => {
  try {
    let options = await PizzaOptions.findOne();

    if (!options) {
      options = await PizzaOptions.create(req.body);
    } else {
      options = await PizzaOptions.findOneAndUpdate(
        {},
        req.body,
        {
          new: true,
          runValidators: true
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Pizza options updated successfully',
      data: options
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;