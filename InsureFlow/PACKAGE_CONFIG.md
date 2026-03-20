# InsureFlow Configuration & Quick Reference

## 1. 3-Minute Super Quick Start

### Option A: Vercel (Recommended)
1. Fork repository.
2. Link to Vercel dashboard.
3. Keep default build settings (Framework Preset: Vite).
4. Click Deploy. Live in 45s.

### Option B: Local 
```bash
git clone insure-flow-repo
npm ci
npm run dev
# Running on http://localhost:5173
```

### Option C: Docker
```bash
docker build -t insureflow .
docker run -p 8080:80 insureflow
```

---

## 2. Configuration Files

### `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  }
})
```

### `postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 3. Customization Guide (< 5 mins)

### Change Zones (Modify Line 20 in InsureFlow.jsx)
```javascript
// Add a high-risk Zone
{ id: 'z9', name: 'Electronic City', tier: 4, basePrice: 65, riskFactor: 2.0 }
```

### Adjust Disruption Thresholds (Line 31)
```javascript
// Change max payout for Heatwave from 300 to 500
{ id: 'd2', type: 'Lethal Heatwave', threshold: '> 45°C', maxPayout: 500, color: '#ef4444' }
```

### Demo Accounts
The MVP currently natively generates deterministic user profiles on *any* 10-digit number entry (e.g. `9876543210`) with `fraudRiskScore` locked to `0.10` initially.

---

## 4. Troubleshooting Guide

**1. Recharts not importing?**
*Fix*: Ensure `npm install recharts` is present in `package.json`. Delete `node_modules` and `npm ci` again.

**2. Tailwind CSS not applying globally?**
*Fix*: Check `index.js/main.jsx` and ensure `import './index.css'` occurs *before* `App.jsx`.

**3. The 6-Layer verification crashes locally without mockData?**
*Fix*: Ensure `VITE_ALLOW_MOCK_DATA=true` is set. Fraud layer 4 explicitly requires a mocked internal database of context objects.
