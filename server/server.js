import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import provisionsRoutes from './routes/provisions.js';
import matchmakingRoutes from './routes/matchmaking.js';
import wasteRoutes from './routes/waste.js';
import notificationsRoutes from './routes/notifications.js';
import ordersRoutes from './routes/orders.js';
import cropsRoutes from './routes/crops.js';
import priceRoutes from './routes/price.js';
import startupRatingRoutes from './routes/startupRating.js';
import farmerRatingRoutes from './routes/farmerRating.js';
import startupsRoutes from './routes/startups.js';
import farmersRoutes from './routes/farmers.js';
import forecastRoutes from './routes/forecast.js';
import carbonRoutes from './routes/carbon.js';
import recommendationsRoutes from './routes/recommendations.js';
import marketPriceRoutes from './routes/marketPrice.js';
import coldStorageRoutes from './routes/coldStorage.js';
import cropMonitorRouter from './routes/cropMonitor.js';
import weightEstimatorRouter from './routes/weightEstimator.js';
import priceNegotiationRoutes from './routes/priceNegotiation.js';
import translationRoute from './routes/translationRoute.js';
import agriNewsRoutes from './routes/agriNews.js';
import walletRoutes from './routes/wallet.js';
import weatherForecastRoutes from './routes/weatherForecast.js';
import loyaltyRoutes from './routes/loyalty.js';
import { seedMarketPricesIfEmpty } from './services/marketPriceService.js';
import { seedCropWasteHistoryIfEmpty } from './scripts/seedCropWasteHistory.js';
import { seedPriceDatasetIfEmpty } from './scripts/seedPriceDataset.js';
import { seedSupplyForecastIfEmpty } from './scripts/seedSupplyForecast.js';
import { apiErrorHandler } from './utils/errorHandler.js';
import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// Load .env from server directory so DEEPSEEK_API_KEY is always found
dotenv.config({ path: path.join(__dirname, '.env') });

// Resolve GOOGLE_APPLICATION_CREDENTIALS to absolute path when relative (so Google libs find the JSON)
const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (creds && !path.isAbsolute(creds)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, creds);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Atlas Connection
const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
const isPlaceholder = !MONGODB_URI || MONGODB_URI.includes('your-') || (MONGODB_URI.includes('password') && !MONGODB_URI.includes('@'));

if (MONGODB_URI && !isPlaceholder) {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas successfully');
      seedMarketPricesIfEmpty();
      seedCropWasteHistoryIfEmpty();
      seedPriceDatasetIfEmpty();
      seedSupplyForecastIfEmpty();
    })
    .catch((error) => {
      console.warn('⚠️ MongoDB Atlas connection error:', error.message);
      console.warn('⚠️ Server will continue without database (development mode)');
      console.warn('   Run: node scripts/check-mongo.js (from server/) for connection help.');
    });
} else {
  if (isPlaceholder && MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI looks like a placeholder - update server/.env with your Atlas URI.');
  } else {
    console.warn('⚠️ MONGODB_URI not set - running in development mode without database');
  }
  console.warn('   Copy server/.env.example to server/.env and set MONGODB_URI from https://cloud.mongodb.com');
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
    message: 'AgroScope Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Swagger (optional - mount before error handler)
try {
  const swaggerUi = require('swagger-ui-express');
  const { swaggerSpec } = require('./config/swagger.cjs');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📚 Swagger UI: http://localhost:' + PORT + '/api-docs');
} catch (e) {
  console.log('📚 Swagger skipped (install swagger-jsdoc & swagger-ui-express for /api-docs)');
}

// API error handler (must be after routes)
app.use(apiErrorHandler);

// ── Production: Serve React frontend ──────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
  });
}
// ──────────────────────────────────────────────────────

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

