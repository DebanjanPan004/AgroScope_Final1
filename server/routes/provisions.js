import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import fetch from 'node-fetch';
import { upsertByFarmer } from '../services/farmerRatingService.js';
const ML_URL = process.env.ML_URL || 'http://127.0.0.1:8000';

const router = express.Router();

// In-memory demo storage for provisions (no MongoDB required)
const DEMO_PROVISIONS = [];

// Create a new provision (farmer only, demo mode)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can create provisions' });
    }
    let { wasteType, quantityTons, location, latitude, longitude, price, wasteQualityGrade, moisturePercentage } = req.body;
    wasteType = typeof wasteType === 'string' ? wasteType.trim() : '';
    quantityTons = Number(quantityTons);
    location = typeof location === 'string' ? location.trim() : '';
    if (!wasteType) wasteType = 'Other';
    if (Number.isNaN(quantityTons) || quantityTons < 0) quantityTons = 0;
    if (!location) location = 'Not specified';

    // Optionally enhance with ML classification + avg price (best-effort)
    let wasteTypeFinal = wasteType;
    let priceFinal = typeof price === 'number' ? price : undefined;
    try {
      if (wasteType === 'auto' || (!wasteType && quantityTons)) {
        const { state, season } = req.body;
        if (state && season) {
          const clsResp = await fetch(`${ML_URL}/predict_category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state, season, quantity_kg: Number(quantityTons) * 1000 })
          });
          if (clsResp.ok) {
            const cls = await clsResp.json();
            if (cls?.category) wasteTypeFinal = cls.category;
            if (typeof cls?.average_price_per_quintal === 'number') priceFinal = cls.average_price_per_quintal;
          }
        }
      }
    } catch {
      // Ignore ML errors in demo mode
    }

    const created = {
      _id: Date.now().toString(),
      userId: req.user.userId,
      wasteType: wasteTypeFinal || wasteType,
      quantityTons: Number(quantityTons),
      location,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      price: priceFinal || null,
      createdAt: new Date().toISOString(),
    };

    DEMO_PROVISIONS.unshift(created);

    let farmerRating = null;
    const grade = wasteQualityGrade && ['A', 'B', 'C'].includes(String(wasteQualityGrade).toUpperCase());
    const moisture = typeof moisturePercentage === 'number' || (typeof moisturePercentage === 'string' && moisturePercentage !== '');
    if (grade && (typeof moisturePercentage === 'number' || (typeof moisturePercentage === 'string' && !Number.isNaN(Number(moisturePercentage))))) {
      try {
        const ratingRes = await upsertByFarmer(req.user.userId, req.user.name || req.user.email || req.user.userId, {
          wasteQualityGrade: String(wasteQualityGrade).toUpperCase(),
          moisturePercentage: Number(moisturePercentage),
        });
        farmerRating = ratingRes.ratingOutOfFive;
      } catch {
        // ignore rating errors
      }
    }

    res.status(201).json({
      message: 'Provision created (demo mode)',
      provision: created,
      ...(farmerRating != null && { farmerRating }),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create provision' });
  }
});

// List ALL provisions (for startups / demo) — no filter by user
router.get('/', requireAuth, (req, res) => {
  try {
    const list = Array.isArray(DEMO_PROVISIONS) ? DEMO_PROVISIONS : [];
    return res.json({ provisions: list, total: list.length });
  } catch (err) {
    return res.json({ provisions: [], total: 0 });
  }
});

// List current user's provisions (farmer only, demo mode)
router.get('/my', requireAuth, (req, res) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ message: 'Only farmers can view provisions' });
  }
  try {
    const userId = req.user.userId;
    const items = Array.isArray(DEMO_PROVISIONS)
      ? DEMO_PROVISIONS.filter((p) => String(p.userId) === String(userId))
      : [];
    return res.json({ provisions: items });
  } catch (err) {
    return res.json({ provisions: [] });
  }
});

export default router;
