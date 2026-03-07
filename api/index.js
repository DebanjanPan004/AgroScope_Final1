// Vercel Serverless Function Wrapper for Express App
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../server/routes/auth.js';
import profileRoutes from '../server/routes/profile.js';
import provisionsRoutes from '../server/routes/provisions.js';
import matchmakingRoutes from '../server/routes/matchmaking.js';
import wasteRoutes from '../server/routes/waste.js';
import notificationsRoutes from '../server/routes/notifications.js';
import ordersRoutes from '../server/routes/orders.js';
import cropsRoutes from '../server/routes/crops.js';
import priceRoutes from '../server/routes/price.js';
import startupRatingRoutes from '../server/routes/startupRating.js';
import farmerRatingRoutes from '../server/routes/farmerRating.js';
import startupsRoutes from '../server/routes/startups.js';
import farmersRoutes from '../server/routes/farmers.js';
import forecastRoutes from '../server/routes/forecast.js';
import carbonRoutes from '../server/routes/carbon.js';
import recommendationsRoutes from '../server/routes/recommendations.js';
import marketPriceRoutes from '../server/routes/marketPrice.js';
import coldStorageRoutes from '../server/routes/coldStorage.js';
import cropMonitorRouter from '../server/routes/cropMonitor.js';
import weightEstimatorRouter from '../server/routes/weightEstimator.js';
import priceNegotiationRoutes from '../server/routes/priceNegotiation.js';
import translationRoute from '../server/routes/translationRoute.js';
import agriNewsRoutes from '../server/routes/agriNews.js';
import walletRoutes from '../server/routes/wallet.js';
import weatherForecastRoutes from '../server/routes/weatherForecast.js';
import loyaltyRoutes from '../server/routes/loyalty.js';
import { seedMarketPricesIfEmpty } from '../server/services/marketPriceService.js';
import { seedCropWasteHistoryIfEmpty } from '../server/scripts/seedCropWasteHistory.js';
import { seedPriceDatasetIfEmpty } from '../server/scripts/seedPriceDataset.js';
import { seedSupplyForecastIfEmpty } from '../server/scripts/seedSupplyForecast.js';
import { apiErrorHandler } from '../server/utils/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection (with caching for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
  const isPlaceholder = !MONGODB_URI || MONGODB_URI.includes('your-') || (MONGODB_URI.includes('password') && !MONGODB_URI.includes('@'));

  if (MONGODB_URI && !isPlaceholder) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      console.log('✅ Connected to MongoDB Atlas');
      
      // Seed data only once when connection is established
      if (!cachedDb) {
        seedMarketPricesIfEmpty();
        seedCropWasteHistoryIfEmpty();
        seedPriceDatasetIfEmpty();
        seedSupplyForecastIfEmpty();
      }
      
      cachedDb = mongoose.connection;
      return cachedDb;
    } catch (error) {
      console.warn('⚠️ MongoDB connection error:', error.message);
    }
  } else {
    console.warn('⚠️ MONGODB_URI not configured properly');
  }
  
  return null;
}

let dbConnectPromise = null;

function ensureDatabaseConnection() {
  if (cachedDb && mongoose.connection.readyState === 1) return;
  if (dbConnectPromise) return;

  // Fire once per cold start; do not block request handling on DB handshake.
  dbConnectPromise = connectToDatabase()
    .catch((error) => {
      console.warn('⚠️ Background MongoDB init failed:', error?.message || error);
    })
    .finally(() => {
      if (mongoose.connection.readyState !== 1) {
        dbConnectPromise = null;
      }
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/provisions', provisionsRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/startup', startupRatingRoutes);
app.use('/api/farmer', farmerRatingRoutes);
app.use('/api/startups', startupsRoutes);
app.use('/api/farmers', farmersRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/market-price', marketPriceRoutes);
app.use('/api/cold-storage', coldStorageRoutes);
app.use('/api/crop-monitor', cropMonitorRouter);
app.use('/api/price-negotiation', priceNegotiationRoutes);
app.use('/api/translate', translationRoute);
app.use('/api/agri-news', agriNewsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/weather-forecast', weatherForecastRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api', weightEstimatorRouter);

// Compatibility routes for current frontend
app.use('/', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AgroScope Backend API is running on Vercel',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API error handler
app.use(apiErrorHandler);

// Export the Express app as a serverless function
export default async function handler(req, res) {
  // Start DB connection in background to avoid serverless timeouts on non-DB routes.
  ensureDatabaseConnection();

  // Handle the request with Express
  return app(req, res);
}
