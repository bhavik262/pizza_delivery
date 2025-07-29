const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const { Pizza, PizzaOptions } = require('../models/Pizza');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const { protect, requireEmailVerification } = require('../middleware/auth');
const razorpayService = require('../utils/razorpayService');
const emailService = require('../utils/emailService');

const router = express.Router();

// @desc    Create new order (before payment)
// @route   POST /api/orders/create
// @access  Private
router.post('/create', [
  protect,
  requireEmailVerification,
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.pizza')
    .isMongoId()
    .withMessage('Valid pizza ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('items.*.size')
    .isIn(['small', 'medium', 'large', 'extra-large'])
    .withMessage('Invalid size'),
  body('deliveryAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('deliveryAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('deliveryAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('deliveryAddress.zipCode')
    .matches(/^\d{6}$/)
    .withMessage('Valid 6-digit zip code is required'),
  body('contactPhone')
    .matches(/^\d{10}$/)
    .withMessage('Valid 10-digit phone number is required'),
  body('paymentMethod')
    .isIn(['razorpay', 'cod'])
    .withMessage('Invalid payment method')
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

    const { items, deliveryAddress, contactPhone, paymentMethod, orderNotes } = req.body;

    // Get pizza options for price calculation
    const pizzaOptions = await PizzaOptions.findOne();
    if (!pizzaOptions) {
      return res.status(500).json({
        success: false,
        message: 'Pizza customization options not configured'
      });
    }

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      // Get pizza details
      const pizza = await Pizza.findById(item.pizza);
      if (!pizza || !pizza.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Pizza ${item.pizza} is not available`
        });
      }

      // Validate size
      const sizeOption = pizza.sizes.find(s => s.size === item.size);
      if (!sizeOption) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} not available for ${pizza.name}`
        });
      }

      // Calculate item price
      let itemPrice = pizza.basePrice * sizeOption.priceMultiplier;
      let customizationCost = 0;

      // Process customizations if provided
      const processedCustomizations = {
        base: null,
        sauce: null,
        cheese: [],
        vegetables: [],
        meats: []
      };

      if (item.customizations) {
        // Process base
        if (item.customizations.base) {
          const baseOption = pizzaOptions.bases.find(b => b.name === item.customizations.base && b.isAvailable);
          if (baseOption) {
            processedCustomizations.base = { name: baseOption.name, price: baseOption.price };
            customizationCost += baseOption.price;
          }
        }

        // Process sauce
        if (item.customizations.sauce) {
          const sauceOption = pizzaOptions.sauces.find(s => s.name === item.customizations.sauce && s.isAvailable);
          if (sauceOption) {
            processedCustomizations.sauce = { name: sauceOption.name, price: sauceOption.price };
            customizationCost += sauceOption.price;
          }
        }

        // Process cheese
        if (item.customizations.cheese && Array.isArray(item.customizations.cheese)) {
          item.customizations.cheese.forEach(cheeseName => {
            const cheeseOption = pizzaOptions.cheeses.find(c => c.name === cheeseName && c.isAvailable);
            if (cheeseOption) {
              processedCustomizations.cheese.push({ name: cheeseOption.name, price: cheeseOption.price });
              customizationCost += cheeseOption.price;
            }
          });
        }

        // Process vegetables
        if (item.customizations.vegetables && Array.isArray(item.customizations.vegetables)) {
          item.customizations.vegetables.forEach(vegName => {
            const vegOption = pizzaOptions.vegetables.find(v => v.name === vegName && v.isAvailable);
            if (vegOption) {
              processedCustomizations.vegetables.push({ name: vegOption.name, price: vegOption.price });
              customizationCost += vegOption.price;
            }
          });
        }

        // Process meats
        if (item.customizations.meats && Array.isArray(item.customizations.meats)) {
          item.customizations.meats.forEach(meatName => {
            const meatOption = pizzaOptions.meats.find(m => m.name === meatName && m.isAvailable);
            if (meatOption) {
              processedCustomizations.meats.push({ name: meatOption.name, price: meatOption.price });
              customizationCost += meatOption.price;
            }
          });
        }
      }

      const totalItemPrice = (itemPrice + customizationCost) * item.quantity;

      orderItems.push({
        pizza: pizza._id,
        quantity: item.quantity,
        size: item.size,
        customizations: processedCustomizations,
        itemPrice: itemPrice + customizationCost,
        totalItemPrice
      });

      subtotal += totalItemPrice;
    }

    // Calculate pricing
    const deliveryFee = 50; // Fixed delivery fee
    const taxRate = 0.05; // 5% tax
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + deliveryFee + tax;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      deliveryAddress,
      contactPhone,
      paymentMethod,
      orderNotes,
      pricing: {
        subtotal,
        deliveryFee,
        tax,
        total
      }
    });

    // Calculate estimated delivery time
    order.calculateEstimatedDeliveryTime();

    // Save order
    await order.save();

    // If payment method is Razorpay, create Razorpay order
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay') {
      try {
        razorpayOrder = await razorpayService.createOrder(
          total,
          'INR',
          order.orderId
        );
        
        // Store Razorpay order ID
        order.paymentDetails.razorpayOrderId = razorpayOrder.orderId;
        await order.save();
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        return res.status(500).json({
          success: false,
          message: 'Payment order creation failed'
        });
      }
    }

    // Populate order for response
    await order.populate('items.pizza', 'name image basePrice');
    await order.populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: order.getOrderSummary(),
        razorpayOrder: razorpayOrder || null,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Verify payment and confirm order
// @route   POST /api/orders/verify-payment
// @access  Private
router.post('/verify-payment', [
  protect,
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  body('razorpayOrderId')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpayPaymentId')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpaySignature')
    .notEmpty()
    .withMessage('Razorpay signature is required')
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

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Find order
    const order = await Order.findOne({ 
      orderId,
      user: req.user.id,
      paymentMethod: 'razorpay'
    }).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Verify payment signature
    const verification = razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update order with payment details
    order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
    order.paymentDetails.razorpaySignature = razorpaySignature;
    order.paymentStatus = 'completed';
    order.orderStatus = 'confirmed';

    await order.save();

    // Update inventory (consume ingredients)
    await updateInventoryForOrder(order);

    // Send confirmation email
    try {
      await order.populate('items.pizza', 'name');
      await emailService.sendOrderConfirmation(order.user, order);
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError);
    }

    // Emit real-time update to user
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.orderStatus,
      message: 'Order confirmed and payment successful!'
    });

    // Emit to admin room for new order notification
    io.to('admin-room').emit('newOrder', {
      orderId: order.orderId,
      user: order.user.name,
      total: order.pricing.total,
      items: order.items.length
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed',
      data: {
        orderId: order.orderId,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus,
        estimatedDeliveryTime: order.estimatedDeliveryTime
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Confirm COD order
// @route   POST /api/orders/confirm-cod
// @access  Private
router.post('/confirm-cod', [
  protect,
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
], async (req, res, next) => {
  try {
    const { orderId } = req.body;

    // Find order
    const order = await Order.findOne({ 
      orderId,
      user: req.user.id,
      paymentMethod: 'cod'
    }).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.orderStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order already processed'
      });
    }

    // Update order status
    order.orderStatus = 'confirmed';
    await order.save();

    // Update inventory
    await updateInventoryForOrder(order);

    // Send confirmation email
    try {
      await order.populate('items.pizza', 'name');
      await emailService.sendOrderConfirmation(order.user, order);
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError);
    }

    // Emit real-time updates
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.orderStatus,
      message: 'Order confirmed! We will start preparing your pizza.'
    });

    io.to('admin-room').emit('newOrder', {
      orderId: order.orderId,
      user: order.user.name,
      total: order.pricing.total,
      items: order.items.length
    });

    res.status(200).json({
      success: true,
      message: 'COD order confirmed successfully',
      data: {
        orderId: order.orderId,
        status: order.orderStatus,
        estimatedDeliveryTime: order.estimatedDeliveryTime
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
router.get('/my-orders', [
  protect,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status')
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = { user: req.user.id };
    
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('items.pizza', 'name image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-paymentDetails -statusHistory');

    // Get total count
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        totalItems: total
      },
      data: orders
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get single order details
// @route   GET /api/orders/:orderId
// @access  Private
router.get('/:orderId', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ 
      orderId: req.params.orderId,
      user: req.user.id 
    })
    .populate('items.pizza', 'name image description')
    .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Track order status
// @route   GET /api/orders/:orderId/track
// @access  Private
router.get('/:orderId/track', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ 
      orderId: req.params.orderId,
      user: req.user.id 
    }).select('orderId orderStatus estimatedDeliveryTime actualDeliveryTime statusHistory createdAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Define status progression
    const statusSteps = [
      { key: 'pending', label: 'Order Received', description: 'Your order has been received' },
      { key: 'confirmed', label: 'Order Confirmed', description: 'Your order has been confirmed' },
      { key: 'preparing', label: 'In the Kitchen', description: 'Our chefs are preparing your pizza' },
      { key: 'ready', label: 'Ready for Delivery', description: 'Your order is ready and will be dispatched soon' },
      { key: 'out-for-delivery', label: 'Out for Delivery', description: 'Your pizza is on the way!' },
      { key: 'delivered', label: 'Delivered', description: 'Order delivered successfully' }
    ];

    // Find current status index
    const currentStatusIndex = statusSteps.findIndex(step => step.key === order.orderStatus);

    // Mark completed steps
    const trackingSteps = statusSteps.map((step, index) => ({
      ...step,
      isCompleted: index <= currentStatusIndex,
      isCurrent: index === currentStatusIndex,
      timestamp: order.statusHistory.find(h => h.status === step.key)?.timestamp || null
    }));

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        currentStatus: order.orderStatus,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime,
        trackingSteps,
        orderTime: order.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Cancel order
// @route   PUT /api/orders/:orderId/cancel
// @access  Private
router.put('/:orderId/cancel', [
  protect,
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason cannot exceed 200 characters')
], async (req, res, next) => {
  try {
    const order = await Order.findOne({ 
      orderId: req.params.orderId,
      user: req.user.id 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }

    // Check if order is already out for delivery
    if (order.orderStatus === 'out-for-delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order is out for delivery and cannot be cancelled. Please contact support.'
      });
    }

    // Update order status
    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      notes: req.body.reason || 'Cancelled by user'
    });

    await order.save();

    // Process refund if payment was completed
    if (order.paymentStatus === 'completed' && order.paymentMethod === 'razorpay') {
      try {
        await razorpayService.refundPayment(
          order.paymentDetails.razorpayPaymentId,
          order.pricing.total,
          'Order cancelled by user'
        );
        order.paymentStatus = 'refunded';
        await order.save();
      } catch (refundError) {
        console.error('Refund processing failed:', refundError);
        // Don't fail the cancellation if refund fails
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.orderStatus,
      message: 'Order cancelled successfully'
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order.orderId,
        status: order.orderStatus,
        refundStatus: order.paymentStatus
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to update inventory when order is confirmed
async function updateInventoryForOrder(order) {
  try {
    for (const item of order.items) {
      // Update inventory for customizations
      if (item.customizations) {
        // Update base inventory
        if (item.customizations.base) {
          await updateInventoryItem(item.customizations.base.name, item.quantity, order.orderId);
        }

        // Update sauce inventory
        if (item.customizations.sauce) {
          await updateInventoryItem(item.customizations.sauce.name, item.quantity, order.orderId);
        }

        // Update cheese inventory
        if (item.customizations.cheese) {
          for (const cheese of item.customizations.cheese) {
            await updateInventoryItem(cheese.name, item.quantity, order.orderId);
          }
        }

        // Update vegetable inventory
        if (item.customizations.vegetables) {
          for (const vegetable of item.customizations.vegetables) {
            await updateInventoryItem(vegetable.name, item.quantity, order.orderId);
          }
        }

        // Update meat inventory
        if (item.customizations.meats) {
          for (const meat of item.customizations.meats) {
            await updateInventoryItem(meat.name, item.quantity, order.orderId);
          }
        }
      }
    }

    // Check for low stock and send alerts
    await checkAndSendLowStockAlerts();
  } catch (error) {
    console.error('Inventory update failed:', error);
  }
}

// Helper function to update individual inventory item
async function updateInventoryItem(itemName, quantity, orderId) {
  try {
    const inventoryItem = await Inventory.findOne({ 
      name: { $regex: new RegExp(itemName, 'i') },
      isActive: true 
    });

    if (inventoryItem) {
      await inventoryItem.updateStock('consumption', quantity, `Used in order ${orderId}`, null, orderId);
    }
  } catch (error) {
    console.error(`Failed to update inventory for ${itemName}:`, error);
  }
}

// Helper function to check and send low stock alerts
async function checkAndSendLowStockAlerts() {
  try {
    const lowStockItems = await Inventory.getItemsNeedingAlerts();
    
    if (lowStockItems.length > 0) {
      await emailService.sendLowStockAlert(lowStockItems);
      
      // Mark alerts as sent
      await Inventory.updateMany(
        { _id: { $in: lowStockItems.map(item => item._id) } },
        { lowStockAlertSent: true }
      );
    }
  } catch (error) {
    console.error('Low stock alert failed:', error);
  }
}

module.exports = router;