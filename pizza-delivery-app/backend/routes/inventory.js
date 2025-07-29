const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../utils/emailService');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect, authorize('admin'));

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private/Admin
router.get('/', [
  query('category')
    .optional()
    .isIn(['base', 'sauce', 'cheese', 'vegetable', 'meat', 'other'])
    .withMessage('Invalid category'),
  query('status')
    .optional()
    .isIn(['normal', 'low', 'critical', 'overstocked'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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
    let query = { isActive: true };

    if (req.query.category) {
      query.category = req.query.category;
    }

    // Get inventory items
    let inventoryItems = await Inventory.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limit);

    // Filter by status if requested
    if (req.query.status) {
      inventoryItems = inventoryItems.filter(item => {
        return item.getStockStatus() === req.query.status;
      });
    }

    // Add computed fields
    const itemsWithStatus = inventoryItems.map(item => ({
      ...item.toObject(),
      stockStatus: item.getStockStatus(),
      stockValue: item.getStockValue(),
      consumptionRate: item.getConsumptionRate(),
      predictedStockOutDate: item.predictStockOutDate()
    }));

    // Get total count
    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: itemsWithStatus.length,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        totalItems: total
      },
      data: itemsWithStatus
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private/Admin
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...item.toObject(),
        stockStatus: item.getStockStatus(),
        stockValue: item.getStockValue(),
        consumptionRate: item.getConsumptionRate(),
        predictedStockOutDate: item.predictStockOutDate()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private/Admin
router.post('/', [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('category')
    .isIn(['base', 'sauce', 'cheese', 'vegetable', 'meat', 'other'])
    .withMessage('Invalid category'),
  body('currentStock')
    .isFloat({ min: 0 })
    .withMessage('Current stock must be a positive number'),
  body('minStockLevel')
    .isFloat({ min: 1 })
    .withMessage('Minimum stock level must be at least 1'),
  body('maxStockLevel')
    .isFloat({ min: 1 })
    .withMessage('Maximum stock level must be at least 1'),
  body('unit')
    .isIn(['kg', 'grams', 'liters', 'ml', 'pieces', 'packets'])
    .withMessage('Invalid unit'),
  body('pricePerUnit')
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be a positive number')
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

    // Check if item already exists
    const existingItem = await Inventory.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Inventory item with this name already exists'
      });
    }

    const item = await Inventory.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Admin
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Item name cannot be empty'),
  body('category')
    .optional()
    .isIn(['base', 'sauce', 'cheese', 'vegetable', 'meat', 'other'])
    .withMessage('Invalid category'),
  body('minStockLevel')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Minimum stock level must be at least 1'),
  body('maxStockLevel')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Maximum stock level must be at least 1'),
  body('unit')
    .optional()
    .isIn(['kg', 'grams', 'liters', 'ml', 'pieces', 'packets'])
    .withMessage('Invalid unit'),
  body('pricePerUnit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be a positive number')
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

    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (req.body.name && req.body.name !== item.name) {
      const existingItem = await Inventory.findOne({ 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'Another inventory item with this name already exists'
        });
      }
    }

    item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update stock levels
// @route   PUT /api/inventory/:id/stock
// @access  Private/Admin
router.put('/:id/stock', [
  body('action')
    .isIn(['restock', 'consumption', 'wastage', 'adjustment'])
    .withMessage('Invalid action'),
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    const { action, quantity, reason } = req.body;

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Store previous stock for comparison
    const previousStock = item.currentStock;
    const previousStatus = item.getStockStatus();

    // Update stock
    await item.updateStock(action, quantity, reason, req.user.id);

    // Check if stock status changed and send alerts if needed
    const newStatus = item.getStockStatus();
    
    if (previousStatus !== 'low' && newStatus === 'low') {
      // Send low stock alert
      try {
        await emailService.sendLowStockAlert([item]);
        item.lowStockAlertSent = true;
        await item.save();
      } catch (emailError) {
        console.error('Low stock alert email failed:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Stock ${action} completed successfully`,
      data: {
        itemId: item._id,
        itemName: item.name,
        action,
        quantity,
        previousStock,
        newStock: item.currentStock,
        stockStatus: newStatus
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get stock history for an item
// @route   GET /api/inventory/:id/history
// @access  Private/Admin
router.get('/:id/history', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('action')
    .optional()
    .isIn(['restock', 'consumption', 'wastage', 'adjustment'])
    .withMessage('Invalid action')
], async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Filter history by action if specified
    let history = item.stockHistory;
    if (req.query.action) {
      history = history.filter(entry => entry.action === req.query.action);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const total = history.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = history.slice(startIndex, endIndex);

    // Populate user information
    await Inventory.populate(paginatedHistory, {
      path: 'performedBy',
      select: 'name email'
    });

    res.status(200).json({
      success: true,
      count: paginatedHistory.length,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
        totalItems: total
      },
      data: paginatedHistory
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get low stock items
// @route   GET /api/inventory/alerts/low-stock
// @access  Private/Admin
router.get('/alerts/low-stock', async (req, res, next) => {
  try {
    const lowStockItems = await Inventory.getLowStockItems();

    // Add computed fields
    const itemsWithDetails = lowStockItems.map(item => ({
      ...item.toObject(),
      stockStatus: item.getStockStatus(),
      consumptionRate: item.getConsumptionRate(),
      predictedStockOutDate: item.predictStockOutDate()
    }));

    res.status(200).json({
      success: true,
      count: itemsWithDetails.length,
      data: itemsWithDetails
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Send low stock alert email
// @route   POST /api/inventory/alerts/send-low-stock
// @access  Private/Admin
router.post('/alerts/send-low-stock', async (req, res, next) => {
  try {
    const lowStockItems = await Inventory.getItemsNeedingAlerts();

    if (lowStockItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No items require low stock alerts'
      });
    }

    // Send alert email
    await emailService.sendLowStockAlert(lowStockItems);

    // Mark alerts as sent
    await Inventory.updateMany(
      { _id: { $in: lowStockItems.map(item => item._id) } },
      { lowStockAlertSent: true }
    );

    res.status(200).json({
      success: true,
      message: `Low stock alert sent for ${lowStockItems.length} items`,
      data: {
        itemCount: lowStockItems.length,
        items: lowStockItems.map(item => ({
          name: item.name,
          currentStock: item.currentStock,
          minStockLevel: item.minStockLevel
        }))
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get inventory statistics
// @route   GET /api/inventory/stats
// @access  Private/Admin
router.get('/stats/overview', async (req, res, next) => {
  try {
    const items = await Inventory.find({ isActive: true });

    // Calculate statistics
    const stats = {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.getStockValue(), 0),
      lowStockItems: items.filter(item => item.isLowStock()).length,
      criticalStockItems: items.filter(item => item.isCriticallyLowStock()).length,
      overstockedItems: items.filter(item => item.currentStock >= item.maxStockLevel).length,
      categoryBreakdown: {},
      stockStatusDistribution: {
        normal: 0,
        low: 0,
        critical: 0,
        overstocked: 0
      }
    };

    // Calculate category breakdown
    items.forEach(item => {
      // Category breakdown
      if (!stats.categoryBreakdown[item.category]) {
        stats.categoryBreakdown[item.category] = {
          count: 0,
          value: 0,
          lowStock: 0
        };
      }
      stats.categoryBreakdown[item.category].count++;
      stats.categoryBreakdown[item.category].value += item.getStockValue();
      if (item.isLowStock()) {
        stats.categoryBreakdown[item.category].lowStock++;
      }

      // Stock status distribution
      const status = item.getStockStatus();
      stats.stockStatusDistribution[status]++;
    });

    // Get recent stock movements
    const recentMovements = [];
    items.forEach(item => {
      const recentHistory = item.stockHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
      
      recentHistory.forEach(movement => {
        recentMovements.push({
          itemName: item.name,
          itemId: item._id,
          ...movement.toObject()
        });
      });
    });

    // Sort recent movements by timestamp
    recentMovements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      data: {
        statistics: stats,
        recentMovements: recentMovements.slice(0, 20) // Last 20 movements
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete inventory item (soft delete)
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Soft delete by setting isActive to false
    item.isActive = false;
    await item.save();

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update stock levels
// @route   PUT /api/inventory/bulk/stock-update
// @access  Private/Admin
router.put('/bulk/stock-update', [
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Updates array is required'),
  body('updates.*.itemId')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  body('updates.*.action')
    .isIn(['restock', 'consumption', 'wastage', 'adjustment'])
    .withMessage('Invalid action'),
  body('updates.*.quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number')
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

    const { updates } = req.body;
    const results = [];
    const errors_occurred = [];

    // Process each update
    for (const update of updates) {
      try {
        const item = await Inventory.findById(update.itemId);
        
        if (!item) {
          errors_occurred.push({
            itemId: update.itemId,
            error: 'Item not found'
          });
          continue;
        }

        const previousStock = item.currentStock;
        await item.updateStock(
          update.action, 
          update.quantity, 
          update.reason || 'Bulk update', 
          req.user.id
        );

        results.push({
          itemId: item._id,
          itemName: item.name,
          action: update.action,
          quantity: update.quantity,
          previousStock,
          newStock: item.currentStock,
          success: true
        });

      } catch (updateError) {
        errors_occurred.push({
          itemId: update.itemId,
          error: updateError.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed. ${results.length} successful, ${errors_occurred.length} failed.`,
      data: {
        successful: results,
        failed: errors_occurred
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;