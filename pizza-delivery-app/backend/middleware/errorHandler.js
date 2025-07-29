const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    if (field === 'email') {
      message = 'Email already exists';
    } else if (field === 'orderId') {
      message = 'Order ID already exists';
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = {
      message,
      statusCode: 400
    };
  }

  // Razorpay errors
  if (err.error && err.error.code) {
    let message = 'Payment processing error';
    
    switch (err.error.code) {
      case 'BAD_REQUEST_ERROR':
        message = 'Invalid payment request';
        break;
      case 'GATEWAY_ERROR':
        message = 'Payment gateway error';
        break;
      case 'SERVER_ERROR':
        message = 'Payment server error';
        break;
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = {
      message,
      statusCode: 500
    };
  }

  // Email service errors
  if (err.code === 'EAUTH' || err.code === 'ECONNECTION') {
    const message = 'Email service error';
    error = {
      message,
      statusCode: 500
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests';
    error = {
      message,
      statusCode: 429
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  // Don't send stack trace in production
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Add error code for client handling
  if (error.code) {
    response.code = error.code;
  }

  // Add validation errors details
  if (err.name === 'ValidationError') {
    response.errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;