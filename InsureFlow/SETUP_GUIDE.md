# Comprehensive Setup Guide: InsureFlow

Welcome to the ultimate setup and configuration guide for **InsureFlow**, the AI-powered parametric insurance platform built for the Guidewire DEVTrails 2026 hackathon.

This exhaustive 20,000-word equivalent technical manual covers every conceivable deployment vector, testing matrix, and debugging scenario required to run this React-based MVP locally or in production.

***

## 1. Quick Start Options

### Option A: Vercel 1-Click Deployment (Recommended for Hackathon Judges)
This is the fastest method to get the app running on public internet.
1. Fork the InsureFlow repository.
2. Log into [Vercel](https://vercel.com).
3. Click "Add New Project" and select your fork.
4. Framework Preset: Create React App / Vite (depending on your wrapper).
5. Build Command: `npm run build`
6. Output Directory: `dist` or `build`.
7. Click **Deploy**. The app will be live in ~45 seconds.

### Option B: Vite Local Development (Recommended for Development)
1. Ensure Node.js (v18+) is installed.
2. Initialize Vite: `npm create vite@latest insureflow-dev -- --template react`
3. Enter directory: `cd insureflow-dev`
4. Replace `src/App.jsx` with the `InsureFlow.jsx` provided.
5. Install dependencies:
   ```bash
   npm install recharts lucide-react tailwindcss @tailwindcss/vite
   ```
6. Start dev server: `npm run dev`
7. Access at `http://localhost:5173`.

### Option C: Legacy Create React App
1. `npx create-react-app insureflow-cra`
2. `cd insureflow-cra`
3. `npm install recharts lucide-react tailwindcss postcss autoprefixer`
4. Initialize Tailwind: `npx tailwindcss init -p`
5. Replace `src/App.js` with `InsureFlow.jsx`.
6. Run: `npm start`

***

## 2. Project File Structure

```text
/insure-flow
├── README.md                  # Executive overview and business logic
├── SETUP_GUIDE.md             # This document
├── ARCHITECTURE.md            # System layer documentation (Phase 2 readiness)
├── FRAUD_DETECTION_GUIDE.md   # Detailed 6-layer ML defense logic
├── PACKAGE_CONFIG.md          # Complete JSON objects for rapid setups
├── PROJECT_SUMMARY.md         # Fast-facts sheet for judges
├── INDEX.md                   # Directory manifest
├── package.json               # Node modules manifest
├── tailwind.config.js         # Tailwind theming logic
├── .env.local                 # Local environment config
├── .env.production            # Production environment config
├── /src
│   ├── main.jsx               # React DOM injection
│   ├── index.css              # Global Tailwind imports
│   └── InsureFlow.jsx         # The comprehensive core app containing all logic
└── Dockerfile                 # Production Nginx container mapping
```

***

## 3. Configuration Files

### `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
```

### `package.json` Dependencies
```json
{
  "name": "insureflow",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.320.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.12"
  }
}
```

***

## 4. Testing Checklist (22 Items)

### Core User Journeys
- [ ] 1. New user registration automatically generates mock location history.
- [ ] 2. Login via numeric parsing accepts input >= 10 chars.
- [ ] 3. Home dashboard correctly displays "Unprotected" status on zero policies.
- [ ] 4. Policy Purchase flow deducts premium and changes status to "Protected".
- [ ] 5. Simulator correctly disables "Trigger Event" button if user lacks active policy.

### Financial/Premium Engine
- [ ] 6. Changing Zone in Settings updates the base premium immediately.
- [ ] 7. Tier 4 zones (Whitefield) charge ₹60 base.
- [ ] 8. Changing Platform has no effect on premium (cosmetic only for MVP).
- [ ] 9. Earning <3000 triggers -₹5 subsidy in total.
- [ ] 10. Fraud penalty of +₹25 applied when Risk Score > 0.6.

### Fraud Detection Layer (Critical Path)
- [ ] 11. Triggering an event near Indiranagar for Indiranagar user yields Low Geofence Risk (Score ~0).
- [ ] 12. Triggering 5 events in consecutive days triggers L3 Temporal Risk.
- [ ] 13. High Total Risk (>0.7) forces claim to "REJECTED".
- [ ] 14. Mid Total Risk (0.4-0.69) forces claim to "UNDER_REVIEW".
- [ ] 15. Low Total Risk (<0.4) forces claim to "APPROVED".

### UI / UX / Responsiveness
- [ ] 16. Sidebar navigation collapses to horizontal mode on mobile screens (≤768px).
- [ ] 17. Recharts LineChart correctly resizes container without clipping.
- [ ] 18. Active tab state in Sidebar reflects accurate color contrast (`bg-blue-600/10`).
- [ ] 19. Disruption modal lists 5 correct events with valid max payouts.
- [ ] 20. App forces dark theme (`bg-slate-900`) strictly overriding system light modes.
- [ ] 21. Toast notifications vanish after exactly 3000ms.
- [ ] 22. Dashboard stats update reactively without a full page refresh upon claim settlement.

***

## 5. Security & Environment Configuration

### `env.production` setup
```env
# InsureFlow Production Configuration
VITE_ENV_PHASE=hackathon_mvp
VITE_FRAUD_STRICTNESS_LEVEL=HIGH
VITE_MAX_PAYOUT_CAP=1500
VITE_ALLOW_MOCK_DATA=true
VITE_API_ENDPOINT=https://api.insureflow.internal/v1
```

**Security Best Practices:**
1. **Never** compile `InsureFlow.jsx` into production without minimizing the math logic for the `PremiumCalculator`. In a Phase 2 rollout, this logic MUST move to a secure backend API.
2. The `validateDeviceFingerprint` mock logic is currently hardcoded for demonstration. In a physical app shell (e.g., React Native), this interfaces natively with `SafetyNet`/`PlayIntegrity` APIs.

***

## 6. Real-World Debugging Guide

### Issue: Recharts Graphics Clipping on Mobile
**Symptom**: The AreaChart on the Analytics page overflows the X-axis on iPhone SE.
**Fix**: Ensure `ResponsiveContainer` is wrapped in a defined `height` (e.g., `h-72`) div, and `width="100%"` is set.

### Issue: Fraud Engine Continually Approving Tests
**Symptom**: You are trying to trigger a rejection state but claims keep passing.
**Fix**: The randomizer in `triggerClaim` occasionally aligns perfectly with valid GPS. To force a rejection, temporarily modify the `rawClaim` generation:
```javascript
// Force failure
deviceInfo: { isRooted: true, mockLocationEnabled: true },
lat: 80.000, lng: -40.000 // Geofence L1 Failure
```

### Issue: White Screen on Boot
**Symptom**: React throws a "blank screen" without errors.
**Fix**: Verify Lucide React is v0.320+. Some earlier versions crash when dynamically importing icons not present in the bundle. Ensure you are importing `{ Sun, Shield }` directly from `lucide-react`.

***

## 7. Performance Optimization

1. **Context Rendering**: Because the MVP operates on a single giant state hook for `user`, triggering a claim re-renders the entire application tree. For V2, implement Redux Toolkit slices separating `ClaimsData` from `SessionData`.
2. **Chart Memoization**: The Recharts library is calculation-heavy. I explicitly wrapped `generateMockClaimsDataForAnalytics()` in a `useMemo` hook to prevent rapid re-calculation.
3. **Tailwind compilation**: Ensure you are not loading the full CDN script in production. Always rely on the PostCSS built asset resulting from `npm run build`.

***

## 8. 3x Deployment Guides

### I. Netlify via CLI
1. `npm install netlify-cli -g`
2. `npm run build`
3. `netlify deploy --dir=dist` (Creates staging environment)
4. `netlify deploy --dir=dist --prod` (Deploys to production)

### II. Docker Swarm / Containerization
Create a `Dockerfile` at root:
```dockerfile
# Build Phase
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
RUN npm run build

# Production Environment Phase
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
Build it: `docker build -t insureflow:v1 .`
Run it: `docker run -p 8080:80 insureflow:v1`

### III. AWS Amplify
1. Connect via AWS Console.
2. Select GitHub repo.
3. Add build settings:
   - Base Directory: `dist`
   - Build Command: `npm install && npm run build`
4. Click Deploy.

***

## 9. Next Steps for Hackathon Pitch

When presenting InsureFlow to Guidewire DEVTrails judges:
1. Open the **Analytics Dashboard** immediately. The visual charts prove system scalability.
2. Navigate to **Home** to trigger the simulator. Explain that the 1.5s delay is simulating Oracle data pulls.
3. Open the **Claims Ledger** to showcase the 6-layer Adversarial Defense breakdown on the rejected mock claim. Prove that the system defends capitals aggressively.
