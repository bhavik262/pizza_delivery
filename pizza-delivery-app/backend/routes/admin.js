const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const { Pizza } = require('../models/Pizza');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../utils/emailService');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect, authorize('admin'));

// @desc    Get dashboard analytics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get order statistics
    const [
      totalOrders,
      todayOrders,
      weekOrders,
      monthOrders,
      pendingOrders,
      activeOrders,
      totalRevenue,
      todayRevenue,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      Order.countDocuments({ orderStatus: { $ne: 'cancelled' } }),
      Order.countDocuments({ 
        createdAt: { $gte: startOfToday },
        orderStatus: { $ne: 'cancelled' }
      }),
      Order.countDocuments({ 
        createdAt: { $gte: startOfWeek },
        orderStatus: { $ne: 'cancelled' }
      }),
      Order.countDocuments({ 
        createdAt: { $gte: startOfMonth },
        orderStatus: { $ne: 'cancelled' }
      }),
      Order.countDocuments({ orderStatus: 'pending' }),
      Order.countDocuments({ 
        orderStatus: { $in: ['confirmed', 'preparing', 'ready', 'out-for-delivery'] }
      }),
      Order.aggregate([
        { $match: { orderStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfToday },
            orderStatus: 'delivered'
          }
        },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ 
        role: 'user',
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .populate('items.pizza', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderId orderStatus pricing.total createdAt user items');

    // Get low stock items
    const lowStockItems = await Inventory.getLowStockItems();

    // Get order status distribution
    const orderStatusDistribution = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get popular pizzas
    const popularPizzas = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.pizza', 
        totalOrdered: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.totalItemPrice' }
      }},
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 },
      { 
        $lookup: {
          from: 'pizzas',
          localField: '_id',
          foreignField: '_id',
          as: 'pizza'
        }
      },
      { $unwind: '$pizza' },
      {
        $project: {
          name: '$pizza.name',
          totalOrdered: 1,
          revenue: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          orders: {
            total: totalOrders,
            today: todayOrders,
            week: weekOrders,
            month: monthOrders,
            pending: pendingOrders,
            active: activeOrders
          },
          revenue: {
            total: totalRevenue[0]?.total || 0,
            today: todayRevenue[0]?.total || 0
          },
          users: {
            total: totalUsers,
            active: activeUsers
          }
        },
        recentOrders,
        lowStockItems: lowStockItems.slice(0, 5),
        orderStatusDistribution,
        popularPizzas
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get all orders with filters
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  query('paymentMethod')
    .optional()
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.paymentMethod) {
      query.paymentMethod = req.query.paymentMethod;
    }

    // Date filters
    if (req.query.startDate) {
      query.createdAt = { $gte: new Date(req.query.startDate) };
    }

    if (req.query.endDate) {
      query.createdAt = { 
        ...query.createdAt,
        $lte: new Date(req.query.endDate) 
      };
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.pizza', 'name image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
// @route   GET /api/admin/orders/:orderId
// @access  Private/Admin
router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate('user', 'name email phone address')
      .populate('items.pizza', 'name image description basePrice');

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

// @desc    Update order status
// @route   PUT /api/admin/orders/:orderId/status
// @access  Private/Admin
router.put('/orders/:orderId/status', [
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
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

    const { status, notes } = req.body;

    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['out-for-delivery', 'cancelled'],
      'out-for-delivery': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    if (!validTransitions[order.orderStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.orderStatus} to ${status}`
      });
    }

    // Update order status
    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes: notes || `Status updated from ${previousStatus} to ${status}`
    });

    // Set actual delivery time if delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Send status update email
    try {
      await emailService.sendOrderStatusUpdate(order.user, order, status);
    } catch (emailError) {
      console.error('Status update email failed:', emailError);
    }

    // Emit real-time update to user
    const io = req.app.get('io');
    io.to(`user-${order.user._id}`).emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.orderStatus,
      message: `Order status updated to ${status.replace('-', ' ')}`
    });

    // Emit to admin room
    io.to('admin-room').emit('orderStatusChanged', {
      orderId: order.orderId,
      status: order.orderStatus,
      updatedBy: req.user.name
    });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order.orderId,
        previousStatus,
        newStatus: status,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', [
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    let query = { role: 'user' };

    // Search functionality
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get users
    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(query);

    // Get order counts for each user
    const usersWithOrderCount = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ 
          user: user._id,
          orderStatus: { $ne: 'cancelled' }
        });
        return {
          ...user.toObject(),
          orderCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        totalItems: total
      },
      data: usersWithOrderCount
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user details with order history
// @route   GET /api/admin/users/:userId
// @access  Private/Admin
router.get('/users/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const orders = await Order.find({ user: req.params.userId })
      .populate('items.pizza', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user statistics
    const [totalOrders, totalSpent, cancelledOrders] = await Promise.all([
      Order.countDocuments({ user: req.params.userId, orderStatus: { $ne: 'cancelled' } }),
      Order.aggregate([
        { $match: { user: user._id, orderStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      Order.countDocuments({ user: req.params.userId, orderStatus: 'cancelled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        statistics: {
          totalOrders,
          totalSpent: totalSpent[0]?.total || 0,
          cancelledOrders
        },
        recentOrders: orders
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:userId/toggle-status
// @access  Private/Admin
router.put('/users/:userId/toggle-status', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify admin user status'
      });
    }

    // Toggle active status
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        isActive: user.isActive
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private/Admin
router.get('/analytics/sales', [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Invalid period'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date')
], async (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    let startDate, endDate;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
    } else {
      const now = new Date();
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          endDate = new Date();
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date();
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date();
          break;
      }
    }

    // Get sales data
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: 'delivered'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'day' ? '%Y-%m-%d %H:00' : 
                     period === 'week' ? '%Y-%m-%d' :
                     period === 'month' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get top performing pizzas
    const topPizzas = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: 'delivered'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.pizza',
          totalOrdered: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalItemPrice' }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'pizzas',
          localField: '_id',
          foreignField: '_id',
          as: 'pizza'
        }
      },
      { $unwind: '$pizza' },
      {
        $project: {
          name: '$pizza.name',
          totalOrdered: 1,
          revenue: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        salesData,
        topPizzas,
        summary: {
          totalRevenue: salesData.reduce((sum, item) => sum + item.revenue, 0),
          totalOrders: salesData.reduce((sum, item) => sum + item.orders, 0),
          avgOrderValue: salesData.length > 0 ? 
            salesData.reduce((sum, item) => sum + item.avgOrderValue, 0) / salesData.length : 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;