import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
let cache = { categories: null, mtimeMs: 0 };

router.get('/types', async (_req, res) => {
  try {
    const csvPath = path.resolve(process.cwd(), 'crops_master_dataset.csv');
    const stat = fs.statSync(csvPath);
    if (!cache.categories || stat.mtimeMs !== cache.mtimeMs) {
      const raw = fs.readFileSync(csvPath, 'utf8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return res.json({ categories: [] });
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const catIdx = header.indexOf('category');
      if (catIdx === -1) return res.json({ categories: [] });
      const set = new Set();
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const val = (cols[catIdx] || '').trim();
        if (val) set.add(val);
      }
      cache = { categories: Array.from(set).sort(), mtimeMs: stat.mtimeMs };
    }
    res.json({ categories: cache.categories });
  } catch (e) {
    res.status(500).json({ categories: [] });
  }
});

export default router;


