# 🍕 Pizza Delivery Application

A full-stack MERN application for pizza delivery with real-time order tracking, payment integration, and admin dashboard.

## 🚀 Features

### 👤 User Features
- **Authentication System**: Registration, login, email verification, forgot/reset password
- **Pizza Menu**: Browse available pizzas with filtering and search
- **Pizza Builder**: Customize pizzas with different bases, sauces, cheese, and toppings
- **Shopping Cart**: Add/remove items, quantity management
- **Order Management**: Place orders with Razorpay or COD payment
- **Real-time Tracking**: Live order status updates
- **Order History**: View past orders and details
- **Profile Management**: Update personal information and address

### 🛠️ Admin Features
- **Dashboard**: Analytics, sales data, order statistics
- **Order Management**: View, update order status, track deliveries
- **Inventory Management**: Track stock levels, update inventory, low stock alerts
- **User Management**: View users, manage accounts
- **Real-time Notifications**: New orders, low stock alerts

### 🔧 Technical Features
- **Real-time Updates**: Socket.IO for live order tracking
- **Payment Integration**: Razorpay (test mode) with secure payment verification
- **Email Service**: Automated emails for verification, orders, and alerts
- **Inventory Tracking**: Automatic stock updates with order processing
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **API Documentation**: RESTful APIs with comprehensive endpoints

## 📁 Project Structure

```
pizza-delivery-app/
├── backend/                 # Express.js Backend
│   ├── models/             # MongoDB Models
│   ├── routes/             # API Routes
│   ├── controllers/        # Route Controllers
│   ├── middleware/         # Custom Middleware
│   ├── utils/              # Utility Functions
│   ├── scripts/            # Database Seeding
│   └── server.js           # Main Server File
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── pages/          # Page Components
│   │   ├── context/        # React Context
│   │   ├── hooks/          # Custom Hooks
│   │   ├── services/       # API Services
│   │   └── utils/          # Utility Functions
│   └── public/             # Static Assets
└── README.md               # Documentation
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Gmail account (for email service)
- Razorpay test account

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd pizza-delivery-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

#### Backend (.env)
Create `backend/.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pizza-delivery?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-complex
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@pizzadelivery.com

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# Admin Configuration
ADMIN_EMAIL=admin@pizzadelivery.com
ADMIN_PASSWORD=admin123

# Stock Alert Configuration
STOCK_ALERT_THRESHOLD=20
STOCK_ALERT_EMAIL=admin@pizzadelivery.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

### 3. Database Setup

```bash
# Navigate to backend directory
cd backend

# Seed the database with initial data
node scripts/seedData.js
```

This will create:
- Admin user account
- Sample pizzas (8 varieties)
- Pizza customization options
- Initial inventory items

### 4. Running the Application

#### Start Backend Server
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:5000

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## 📧 Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASS`

## 💳 Razorpay Setup

1. Create account at https://razorpay.com
2. Go to Dashboard → Settings → API Keys
3. Generate Test API Keys
4. Use Key ID and Secret in environment variables

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Forgot password
- `PUT /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email

### Pizza Management
- `GET /api/pizza` - Get all pizzas (with filters)
- `GET /api/pizza/:id` - Get single pizza
- `GET /api/pizza/options/customization` - Get customization options
- `POST /api/pizza/calculate-price` - Calculate pizza price
- `GET /api/pizza/featured/recommendations` - Get featured pizzas

### Order Management
- `POST /api/orders/create` - Create new order
- `POST /api/orders/verify-payment` - Verify Razorpay payment
- `POST /api/orders/confirm-cod` - Confirm COD order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders/:orderId/track` - Track order status
- `PUT /api/orders/:orderId/cancel` - Cancel order

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard analytics
- `GET /api/admin/orders` - All orders with filters
- `PUT /api/admin/orders/:orderId/status` - Update order status
- `GET /api/admin/users` - Get all users
- `GET /api/admin/analytics/sales` - Sales analytics

### Inventory Management
- `GET /api/inventory` - Get inventory items
- `POST /api/inventory` - Add inventory item
- `PUT /api/inventory/:id/stock` - Update stock levels
- `GET /api/inventory/alerts/low-stock` - Get low stock items
- `POST /api/inventory/alerts/send-low-stock` - Send low stock alerts

## 🔐 Default Admin Credentials

After seeding the database:
- **Email**: admin@pizzadelivery.com
- **Password**: admin123

## 🎨 Frontend Features

### User Interface
- **Responsive Design**: Mobile-first approach
- **Modern UI**: Clean, intuitive interface
- **Real-time Updates**: Live order status updates
- **Toast Notifications**: User feedback for actions
- **Loading States**: Smooth user experience

### Key Components
- **Pizza Builder**: Interactive pizza customization
- **Shopping Cart**: Dynamic cart management
- **Order Tracking**: Real-time status updates
- **Payment Integration**: Secure Razorpay integration
- **Admin Dashboard**: Comprehensive management interface

## 🚦 Order Status Flow

1. **Pending** → Order created, awaiting payment
2. **Confirmed** → Payment successful, order confirmed
3. **Preparing** → Order being prepared in kitchen
4. **Ready** → Order ready for delivery
5. **Out for Delivery** → Order dispatched
6. **Delivered** → Order completed

## 📊 Inventory Management

### Stock Tracking
- Automatic stock updates when orders are placed
- Low stock alerts via email
- Stock history tracking
- Consumption rate analysis

### Stock Levels
- **Normal**: Above minimum threshold
- **Low**: At or below minimum threshold
- **Critical**: Below half of minimum threshold
- **Overstocked**: Above maximum threshold

## 🔄 Real-time Features

### Socket.IO Events
- **Order Status Updates**: Real-time status changes
- **New Order Notifications**: Admin notifications
- **Inventory Alerts**: Low stock notifications
- **User Notifications**: Order confirmations

## 🧪 Testing

### Test Data
The seeder creates:
- 8 sample pizzas across different categories
- 25+ inventory items
- Complete customization options
- Admin user account

### Test Payments
Use Razorpay test cards:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002

## 📱 Mobile Responsiveness

- Fully responsive design
- Touch-friendly interface
- Optimized for mobile ordering
- Progressive Web App ready

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting on sensitive routes
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas
2. Configure environment variables
3. Deploy to Heroku/Railway/DigitalOcean
4. Update CORS origins

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel/Netlify
3. Update API URLs in environment variables

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB URI
   - Ensure network access in MongoDB Atlas

2. **Email Not Sending**
   - Verify Gmail app password
   - Check email credentials

3. **Payment Issues**
   - Verify Razorpay keys
   - Check test mode configuration

4. **Socket Connection Failed**
   - Ensure backend server is running
   - Check CORS configuration

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://reactjs.org/)
- [Razorpay Integration](https://razorpay.com/docs/)
- [Socket.IO Documentation](https://socket.io/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**🍕 Happy Coding! Enjoy building your Pizza Delivery Application!**