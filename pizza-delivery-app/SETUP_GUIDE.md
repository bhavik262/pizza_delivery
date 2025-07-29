# 🚀 Complete Setup Guide for Pizza Delivery App

## Step 1: Check Prerequisites

### 1.1 Install Node.js
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from: https://nodejs.org/
# Install LTS version (v18 or higher)
```

### 1.2 Install Git (if not already installed)
```bash
# Check if Git is installed
git --version

# If not installed, download from: https://git-scm.com/
```

## Step 2: Download and Setup Project

### 2.1 Navigate to your desired directory
```bash
# Example: Go to Desktop or Documents
cd Desktop
# or
cd Documents
```

### 2.2 Copy the project files
Since you already have the project structure, copy the entire `pizza-delivery-app` folder to your laptop.

### 2.3 Navigate to project directory
```bash
cd pizza-delivery-app
ls -la  # Check if you see backend/ and frontend/ folders
```

## Step 3: Setup Backend

### 3.1 Install Backend Dependencies
```bash
cd backend
npm install
```

### 3.2 Create Environment File
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your details
# Use any text editor (VS Code, nano, vim, etc.)
nano .env
# or
code .env
```

### 3.3 Configure .env File
Replace the placeholder values in `.env` with your actual credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (You'll set this up in Step 4)
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/pizza-delivery?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-make-it-at-least-32-characters-long
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (You'll set this up in Step 5)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=noreply@pizzadelivery.com

# Razorpay Configuration (You'll set this up in Step 6)
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

## Step 4: Setup MongoDB Atlas (Free)

### 4.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free"
3. Sign up with your email
4. Choose "Build a database"
5. Select "M0 Sandbox" (FREE)
6. Choose a cloud provider and region
7. Create cluster

### 4.2 Create Database User
1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `pizzauser` (or any name you prefer)
5. Password: Generate a secure password
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 4.3 Configure Network Access
1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Add Entry"

### 4.4 Get Connection String
1. Go to "Databases" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `pizza-delivery`
7. Update `MONGODB_URI` in your `.env` file

## Step 5: Setup Gmail for Email Service

### 5.1 Enable 2-Factor Authentication
1. Go to Google Account settings
2. Security → 2-Step Verification
3. Follow the setup process

### 5.2 Generate App Password
1. In Google Account settings
2. Security → 2-Step Verification → App passwords
3. Select "Mail" and your device
4. Copy the 16-character password
5. Update `EMAIL_USER` and `EMAIL_PASS` in your `.env` file

## Step 6: Setup Razorpay (Optional for Testing)

### 6.1 Create Razorpay Account
1. Go to https://razorpay.com/
2. Sign up for free account
3. Complete verification process

### 6.2 Get Test API Keys
1. Go to Dashboard → Settings → API Keys
2. Download Test Keys
3. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`

**Note**: You can skip Razorpay setup initially and use COD (Cash on Delivery) for testing.

## Step 7: Seed Database with Sample Data

```bash
# Make sure you're in the backend directory
cd backend

# Run the seeding script
node scripts/seedData.js
```

You should see output like:
```
🌱 Starting database seeding...
🗑️  Clearing existing data...
👤 Creating admin user...
✅ Admin user created
🍕 Creating pizzas...
✅ 8 pizzas created
🛠️  Creating pizza customization options...
✅ Pizza options created
📦 Creating inventory items...
✅ 27 inventory items created
🎉 Database seeding completed successfully!
```

## Step 8: Start Backend Server

```bash
# Make sure you're in the backend directory
cd backend

# Start the development server
npm run dev
```

You should see:
```
🍕 Pizza Delivery Server running on port 5000
📱 Socket.IO server ready for real-time updates
MongoDB Connected: cluster0.xxxxx.mongodb.net
```

**Keep this terminal open!** The backend server is now running.

## Step 9: Setup Frontend

### 9.1 Open New Terminal
Open a new terminal window/tab and navigate to the frontend directory:

```bash
cd pizza-delivery-app/frontend
```

### 9.2 Install Frontend Dependencies
```bash
npm install
```

### 9.3 Create Frontend Environment File
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file
nano .env
# or
code .env
```

### 9.4 Configure Frontend .env
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

### 9.5 Start Frontend Development Server
```bash
npm run dev
```

You should see:
```
  VITE v5.4.10  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Step 10: Test the Application

### 10.1 Open Your Browser
Go to: http://localhost:5173

### 10.2 Test Admin Login
1. Click "Login" 
2. Use admin credentials:
   - Email: `admin@pizzadelivery.com`
   - Password: `admin123`

### 10.3 Test User Registration
1. Click "Register"
2. Fill in your details
3. Check your email for verification link

### 10.4 Test Pizza Ordering
1. Browse the menu
2. Customize a pizza
3. Add to cart
4. Proceed to checkout
5. Choose COD payment method

## Step 11: Verify Everything is Working

### 11.1 Check Backend Health
Open: http://localhost:5000/api/health

Should return:
```json
{
  "success": true,
  "message": "Pizza Delivery API is running!",
  "timestamp": "2024-01-XX..."
}
```

### 11.2 Check Database Connection
In your backend terminal, you should see:
```
MongoDB Connected: cluster0.xxxxx.mongodb.net
```

### 11.3 Test Email Service (Optional)
Try the "Forgot Password" feature to test email sending.

## 🚨 Troubleshooting Common Issues

### Issue 1: "Cannot connect to MongoDB"
**Solution:**
- Check your MongoDB URI in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify database user credentials

### Issue 2: "Email not sending"
**Solution:**
- Verify Gmail app password (16 characters, no spaces)
- Check if 2FA is enabled on Gmail
- Ensure EMAIL_USER and EMAIL_PASS are correct

### Issue 3: "Port already in use"
**Solution:**
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in backend/.env
PORT=5001
```

### Issue 4: "Module not found"
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue 5: Frontend won't start
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## 🎯 Quick Start Commands Summary

```bash
# Terminal 1 - Backend
cd pizza-delivery-app/backend
npm install
# Configure .env file
node scripts/seedData.js
npm run dev

# Terminal 2 - Frontend  
cd pizza-delivery-app/frontend
npm install
# Configure .env file
npm run dev
```

## 🔗 Important URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Admin Login**: admin@pizzadelivery.com / admin123

## 📱 Test the Application

1. **Register a new user account**
2. **Verify email** (check your Gmail)
3. **Browse pizzas** on the menu
4. **Customize a pizza** with the builder
5. **Add to cart** and checkout
6. **Track your order** status
7. **Login as admin** to manage orders

## 🎉 Success!

If you can see the Pizza Delivery homepage and both terminals are running without errors, congratulations! Your Pizza Delivery Application is now running successfully on your laptop.

**Next Steps:**
- Explore all features (user registration, pizza builder, order tracking)
- Test admin panel (order management, inventory)
- Try placing test orders
- Customize the application as needed

Happy coding! 🍕