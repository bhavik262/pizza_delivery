const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Send email verification
  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const mailOptions = {
      from: `"Pizza Delivery" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Verify Your Email - Pizza Delivery',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; }
                .button { 
                    display: inline-block; 
                    background: #ff6b35; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🍕 Welcome to Pizza Delivery!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>Thank you for signing up with Pizza Delivery! To complete your registration, please verify your email address by clicking the button below:</p>
                    
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                    
                    <p><strong>This link will expire in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account with us, please ignore this email.</p>
                    
                    <p>Happy ordering!<br>The Pizza Delivery Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Pizza Delivery. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Email verification send error:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Pizza Delivery" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Password Reset Request - Pizza Delivery',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; }
                .button { 
                    display: inline-block; 
                    background: #ff6b35; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>You requested a password reset for your Pizza Delivery account. Click the button below to reset your password:</p>
                    
                    <a href="${resetUrl}" class="button">Reset Password</a>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This link will expire in 10 minutes</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password will remain unchanged until you create a new one</li>
                        </ul>
                    </div>
                    
                    <p>Stay safe!<br>The Pizza Delivery Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Pizza Delivery. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Password reset email send error:', error);
      throw error;
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(user, order) {
    const orderItems = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.pizza.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.size}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${item.totalItemPrice}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"Pizza Delivery" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: `Order Confirmation - ${order.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; }
                .order-summary { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
                .total { font-size: 18px; font-weight: bold; color: #28a745; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Order Confirmed!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>Your order has been confirmed and is being prepared with love! 🍕</p>
                    
                    <div class="order-summary">
                        <h3>Order Details</h3>
                        <p><strong>Order ID:</strong> ${order.orderId}</p>
                        <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryTime).toLocaleString()}</p>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Size</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItems}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 20px; text-align: right;">
                            <p>Subtotal: ₹${order.pricing.subtotal}</p>
                            <p>Delivery Fee: ₹${order.pricing.deliveryFee}</p>
                            <p>Tax: ₹${order.pricing.tax}</p>
                            <p class="total">Total: ₹${order.pricing.total}</p>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <h4>Delivery Address:</h4>
                            <p>${order.deliveryAddress.street}<br>
                            ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}</p>
                        </div>
                    </div>
                    
                    <p>You can track your order status in real-time by logging into your account.</p>
                    
                    <p>Thank you for choosing Pizza Delivery!<br>The Pizza Delivery Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Pizza Delivery. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Order confirmation email send error:', error);
      throw error;
    }
  }

  // Send low stock alert to admin
  async sendLowStockAlert(lowStockItems) {
    const itemsList = lowStockItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #dc3545;">${item.currentStock} ${item.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.minStockLevel} ${item.unit}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"Pizza Delivery System" <${process.env.EMAIL_FROM}>`,
      to: process.env.STOCK_ALERT_EMAIL,
      subject: '⚠️ Low Stock Alert - Immediate Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; }
                .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; background: white; }
                th { background: #dc3545; color: white; padding: 10px; text-align: left; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ LOW STOCK ALERT</h1>
                </div>
                <div class="content">
                    <div class="alert">
                        <strong>Immediate Action Required!</strong><br>
                        The following items are running low and need to be restocked immediately to avoid service disruption.
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Current Stock</th>
                                <th>Minimum Required</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                        </tbody>
                    </table>
                    
                    <p><strong>Please restock these items as soon as possible to maintain service quality.</strong></p>
                    
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                <div class="footer">
                    <p>© 2024 Pizza Delivery System. Automated Alert.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Low stock alert sent to admin`);
      return { success: true };
    } catch (error) {
      console.error('Low stock alert email send error:', error);
      throw error;
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(user, order, newStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared! 👨‍🍳',
      preparing: 'Our chefs are working on your delicious pizza! 🍕',
      ready: 'Your order is ready and will be dispatched shortly! 📦',
      'out-for-delivery': 'Your pizza is on the way! Our delivery person will be there soon! 🚗',
      delivered: 'Your order has been delivered! Enjoy your meal! 🎉'
    };

    const mailOptions = {
      from: `"Pizza Delivery" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: `Order Update - ${order.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; }
                .status-update { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #17a2b8; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📱 Order Status Update</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    
                    <div class="status-update">
                        <h3>Order ${order.orderId}</h3>
                        <p style="font-size: 18px; margin: 15px 0;">${statusMessages[newStatus] || 'Your order status has been updated.'}</p>
                        <p><strong>Current Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('-', ' ')}</p>
                        ${newStatus === 'out-for-delivery' ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryTime).toLocaleString()}</p>` : ''}
                    </div>
                    
                    <p>You can track your order in real-time by logging into your account.</p>
                    
                    <p>Thank you for choosing Pizza Delivery!<br>The Pizza Delivery Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 Pizza Delivery. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Order status update email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Order status update email send error:', error);
      throw error;
    }
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return { success: true };
    } catch (error) {
      console.error('Email service connection error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();