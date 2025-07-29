const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const { Pizza, PizzaOptions } = require('../models/Pizza');
const Inventory = require('../models/Inventory');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Sample data
const adminUser = {
  name: 'Admin User',
  email: process.env.ADMIN_EMAIL || 'admin@pizzadelivery.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  phone: '9999999999',
  address: {
    street: 'Admin Street',
    city: 'Admin City',
    state: 'Admin State',
    zipCode: '123456'
  },
  role: 'admin',
  isEmailVerified: true,
  isActive: true
};

const samplePizzas = [
  {
    name: 'Margherita',
    description: 'Classic Italian pizza with fresh tomatoes, mozzarella cheese, and basil leaves',
    image: 'margherita.jpg',
    category: 'vegetarian',
    basePrice: 299,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.5,
    numOfReviews: 150,
    preparationTime: 15,
    ingredients: ['Tomato Sauce', 'Mozzarella Cheese', 'Fresh Basil', 'Olive Oil'],
    nutritionalInfo: {
      calories: 250,
      protein: 12,
      carbs: 30,
      fat: 10,
      fiber: 2
    }
  },
  {
    name: 'Pepperoni Supreme',
    description: 'Loaded with pepperoni, extra cheese, and a blend of Italian herbs',
    image: 'pepperoni-supreme.jpg',
    category: 'non-vegetarian',
    basePrice: 399,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.7,
    numOfReviews: 200,
    preparationTime: 18,
    ingredients: ['Tomato Sauce', 'Mozzarella Cheese', 'Pepperoni', 'Italian Herbs'],
    nutritionalInfo: {
      calories: 320,
      protein: 16,
      carbs: 28,
      fat: 18,
      fiber: 2
    }
  },
  {
    name: 'Veggie Delight',
    description: 'Fresh vegetables including bell peppers, mushrooms, onions, and olives',
    image: 'veggie-delight.jpg',
    category: 'vegetarian',
    basePrice: 349,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.3,
    numOfReviews: 120,
    preparationTime: 16,
    ingredients: ['Tomato Sauce', 'Mozzarella Cheese', 'Bell Peppers', 'Mushrooms', 'Onions', 'Olives'],
    nutritionalInfo: {
      calories: 230,
      protein: 10,
      carbs: 32,
      fat: 8,
      fiber: 4
    }
  },
  {
    name: 'BBQ Chicken',
    description: 'Grilled chicken with BBQ sauce, red onions, and cilantro',
    image: 'bbq-chicken.jpg',
    category: 'non-vegetarian',
    basePrice: 449,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.6,
    numOfReviews: 180,
    preparationTime: 20,
    ingredients: ['BBQ Sauce', 'Mozzarella Cheese', 'Grilled Chicken', 'Red Onions', 'Cilantro'],
    nutritionalInfo: {
      calories: 350,
      protein: 20,
      carbs: 30,
      fat: 16,
      fiber: 2
    }
  },
  {
    name: 'Hawaiian Paradise',
    description: 'Ham and pineapple with extra cheese on a tomato base',
    image: 'hawaiian.jpg',
    category: 'non-vegetarian',
    basePrice: 429,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.2,
    numOfReviews: 95,
    preparationTime: 17,
    ingredients: ['Tomato Sauce', 'Mozzarella Cheese', 'Ham', 'Pineapple'],
    nutritionalInfo: {
      calories: 310,
      protein: 15,
      carbs: 35,
      fat: 12,
      fiber: 2
    }
  },
  {
    name: 'Vegan Special',
    description: 'Plant-based cheese with fresh vegetables and vegan-friendly toppings',
    image: 'vegan-special.jpg',
    category: 'vegan',
    basePrice: 379,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.4,
    numOfReviews: 75,
    preparationTime: 16,
    ingredients: ['Tomato Sauce', 'Vegan Cheese', 'Bell Peppers', 'Mushrooms', 'Spinach', 'Cherry Tomatoes'],
    nutritionalInfo: {
      calories: 220,
      protein: 8,
      carbs: 30,
      fat: 9,
      fiber: 5
    }
  },
  {
    name: 'Meat Lovers',
    description: 'Loaded with pepperoni, sausage, ham, and bacon',
    image: 'meat-lovers.jpg',
    category: 'non-vegetarian',
    basePrice: 499,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.8,
    numOfReviews: 220,
    preparationTime: 22,
    ingredients: ['Tomato Sauce', 'Mozzarella Cheese', 'Pepperoni', 'Sausage', 'Ham', 'Bacon'],
    nutritionalInfo: {
      calories: 420,
      protein: 22,
      carbs: 28,
      fat: 25,
      fiber: 2
    }
  },
  {
    name: 'Four Cheese',
    description: 'A blend of mozzarella, cheddar, parmesan, and goat cheese',
    image: 'four-cheese.jpg',
    category: 'specialty',
    basePrice: 459,
    sizes: [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1.0 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'extra-large', priceMultiplier: 1.6 }
    ],
    isCustomizable: true,
    isAvailable: true,
    rating: 4.5,
    numOfReviews: 110,
    preparationTime: 18,
    ingredients: ['White Sauce', 'Mozzarella Cheese', 'Cheddar Cheese', 'Parmesan Cheese', 'Goat Cheese'],
    nutritionalInfo: {
      calories: 380,
      protein: 18,
      carbs: 25,
      fat: 22,
      fiber: 1
    }
  }
];

const pizzaOptions = {
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
};

const inventoryItems = [
  // Bases
  { name: 'Thin Crust', category: 'base', currentStock: 100, minStockLevel: 20, maxStockLevel: 200, unit: 'pieces', pricePerUnit: 15 },
  { name: 'Thick Crust', category: 'base', currentStock: 80, minStockLevel: 15, maxStockLevel: 150, unit: 'pieces', pricePerUnit: 20 },
  { name: 'Cheese Burst', category: 'base', currentStock: 50, minStockLevel: 10, maxStockLevel: 100, unit: 'pieces', pricePerUnit: 35 },
  { name: 'Whole Wheat', category: 'base', currentStock: 60, minStockLevel: 15, maxStockLevel: 120, unit: 'pieces', pricePerUnit: 18 },
  { name: 'Gluten Free', category: 'base', currentStock: 30, minStockLevel: 10, maxStockLevel: 80, unit: 'pieces', pricePerUnit: 25 },

  // Sauces
  { name: 'Tomato Sauce', category: 'sauce', currentStock: 50, minStockLevel: 10, maxStockLevel: 100, unit: 'liters', pricePerUnit: 150 },
  { name: 'White Sauce', category: 'sauce', currentStock: 30, minStockLevel: 8, maxStockLevel: 60, unit: 'liters', pricePerUnit: 200 },
  { name: 'Pesto Sauce', category: 'sauce', currentStock: 20, minStockLevel: 5, maxStockLevel: 40, unit: 'liters', pricePerUnit: 300 },
  { name: 'BBQ Sauce', category: 'sauce', currentStock: 25, minStockLevel: 6, maxStockLevel: 50, unit: 'liters', pricePerUnit: 250 },
  { name: 'Spicy Sauce', category: 'sauce', currentStock: 35, minStockLevel: 8, maxStockLevel: 70, unit: 'liters', pricePerUnit: 180 },

  // Cheeses
  { name: 'Mozzarella', category: 'cheese', currentStock: 25, minStockLevel: 5, maxStockLevel: 50, unit: 'kg', pricePerUnit: 400 },
  { name: 'Cheddar', category: 'cheese', currentStock: 15, minStockLevel: 3, maxStockLevel: 30, unit: 'kg', pricePerUnit: 500 },
  { name: 'Parmesan', category: 'cheese', currentStock: 10, minStockLevel: 2, maxStockLevel: 20, unit: 'kg', pricePerUnit: 800 },
  { name: 'Goat Cheese', category: 'cheese', currentStock: 8, minStockLevel: 2, maxStockLevel: 15, unit: 'kg', pricePerUnit: 1000 },
  { name: 'Vegan Cheese', category: 'cheese', currentStock: 12, minStockLevel: 3, maxStockLevel: 25, unit: 'kg', pricePerUnit: 600 },

  // Vegetables
  { name: 'Bell Peppers', category: 'vegetable', currentStock: 20, minStockLevel: 5, maxStockLevel: 40, unit: 'kg', pricePerUnit: 80 },
  { name: 'Mushrooms', category: 'vegetable', currentStock: 15, minStockLevel: 3, maxStockLevel: 30, unit: 'kg', pricePerUnit: 120 },
  { name: 'Onions', category: 'vegetable', currentStock: 30, minStockLevel: 8, maxStockLevel: 60, unit: 'kg', pricePerUnit: 40 },
  { name: 'Tomatoes', category: 'vegetable', currentStock: 25, minStockLevel: 6, maxStockLevel: 50, unit: 'kg', pricePerUnit: 60 },
  { name: 'Olives', category: 'vegetable', currentStock: 10, minStockLevel: 2, maxStockLevel: 20, unit: 'kg', pricePerUnit: 300 },
  { name: 'Spinach', category: 'vegetable', currentStock: 8, minStockLevel: 2, maxStockLevel: 15, unit: 'kg', pricePerUnit: 100 },
  { name: 'Corn', category: 'vegetable', currentStock: 12, minStockLevel: 3, maxStockLevel: 25, unit: 'kg', pricePerUnit: 70 },
  { name: 'Jalapeños', category: 'vegetable', currentStock: 5, minStockLevel: 1, maxStockLevel: 10, unit: 'kg', pricePerUnit: 200 },

  // Meats
  { name: 'Pepperoni', category: 'meat', currentStock: 8, minStockLevel: 2, maxStockLevel: 15, unit: 'kg', pricePerUnit: 800 },
  { name: 'Chicken', category: 'meat', currentStock: 12, minStockLevel: 3, maxStockLevel: 25, unit: 'kg', pricePerUnit: 300 },
  { name: 'Sausage', category: 'meat', currentStock: 10, minStockLevel: 2, maxStockLevel: 20, unit: 'kg', pricePerUnit: 600 },
  { name: 'Ham', category: 'meat', currentStock: 6, minStockLevel: 2, maxStockLevel: 12, unit: 'kg', pricePerUnit: 700 },
  { name: 'Bacon', category: 'meat', currentStock: 7, minStockLevel: 2, maxStockLevel: 15, unit: 'kg', pricePerUnit: 900 }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Pizza.deleteMany({});
    await PizzaOptions.deleteMany({});
    await Inventory.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    adminUser.password = await bcrypt.hash(adminUser.password, salt);
    await User.create(adminUser);
    console.log('✅ Admin user created');

    // Create pizzas
    console.log('🍕 Creating pizzas...');
    await Pizza.insertMany(samplePizzas);
    console.log(`✅ ${samplePizzas.length} pizzas created`);

    // Create pizza options
    console.log('🛠️  Creating pizza customization options...');
    await PizzaOptions.create(pizzaOptions);
    console.log('✅ Pizza options created');

    // Create inventory items
    console.log('📦 Creating inventory items...');
    await Inventory.insertMany(inventoryItems);
    console.log(`✅ ${inventoryItems.length} inventory items created`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Admin user: ${adminUser.email} (password: ${process.env.ADMIN_PASSWORD || 'admin123'})`);
    console.log(`   - Pizzas: ${samplePizzas.length}`);
    console.log(`   - Inventory items: ${inventoryItems.length}`);
    console.log('   - Pizza customization options: Complete set');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

const runSeeder = async () => {
  try {
    await connectDB();
    await seedDatabase();
    console.log('\n🚀 You can now start the server with: npm run dev');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  runSeeder();
}

module.exports = { seedDatabase, connectDB };