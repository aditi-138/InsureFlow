import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  ShieldAlert, ShieldCheck, User, MapPin, Cloudy, Sun, Wind, 
  AlertTriangle, Settings, LogOut, CheckCircle, XCircle, ChevronRight,
  TrendingUp, Activity, Smartphone, ServerCrash, Home, PieChart as PieChartIcon
} from 'lucide-react';

// ==========================================
// CORE DATA MODELS & CONSTANTS
// ==========================================

const ZONES = [
  { id: 'z1', name: 'Whitefield', tier: 4, basePrice: 60, riskFactor: 1.8 },
  { id: 'z2', name: 'Outer Ring Road', tier: 4, basePrice: 60, riskFactor: 1.9 },
  { id: 'z3', name: 'Indiranagar', tier: 3, basePrice: 45, riskFactor: 1.5 },
  { id: 'z4', name: 'HSR Layout', tier: 3, basePrice: 45, riskFactor: 1.6 },
  { id: 'z5', name: 'Koramangala', tier: 2, basePrice: 30, riskFactor: 1.2 },
  { id: 'z6', name: 'MG Road', tier: 2, basePrice: 30, riskFactor: 1.1 },
  { id: 'z7', name: 'Jayanagar', tier: 1, basePrice: 20, riskFactor: 0.8 },
  { id: 'z8', name: 'Malleshwaram', tier: 1, basePrice: 20, riskFactor: 0.7 }
];

const DISRUPTIONS = [
  { id: 'd1', type: 'Severe Rain (Monsoon)', threshold: '> 50mm/hr', maxPayout: 800, color: '#3b82f6', icon: <Cloudy size={20} /> },
  { id: 'd2', type: 'Lethal Heatwave', threshold: '> 42°C', maxPayout: 300, color: '#ef4444', icon: <Sun size={20} /> },
  { id: 'd3', type: 'Hazardous AQI', threshold: 'AQI > 350', maxPayout: 200, color: '#8b5cf6', icon: <Wind size={20} /> },
  { id: 'd4', type: 'Civic Curfew', threshold: 'Sec 144 Imposed', maxPayout: 1200, color: '#f59e0b', icon: <ShieldAlert size={20} /> },
  { id: 'd5', type: 'Platform Crash', threshold: 'App Offline > 2hr', maxPayout: 400, color: '#ec4899', icon: <ServerCrash size={20} /> }
];

const DELIVERY_PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Dunzo'];
const WEATHER_SCENARIOS = ['Clear', 'Rainy', 'Hot', 'Polluted', 'Stormy'];

// ==========================================
// BUSINESS LOGIC: PREMIUM CALCULATOR
// ==========================================

class PremiumCalculator {
  static calculateWeeklyPremium(userProfile) {
    if (!userProfile) return { final: 0 };
    
    // Base Price by Zone Tier
    const zone = ZONES.find(z => z.name === userProfile.zone) || ZONES[6];
    let base = zone.basePrice;
    
    // Earnings-based subsidy
    let earningsAdj = 0;
    if (userProfile.weeklyEarnings < 3000) earningsAdj = -5;
    else if (userProfile.weeklyEarnings > 5000) earningsAdj = 10;
    
    // Risk loading logic (Past 90 days claims frequency)
    const recentClaims = userProfile.claims?.filter(c => {
      const diffDays = Math.floor((new Date() - new Date(c.timestamp)) / (1000 * 60 * 60 * 24));
      return diffDays <= 90;
    }).length || 0;
    
    let riskLoading = 0;
    if (recentClaims >= 4) riskLoading = 10;
    else if (recentClaims >= 2) riskLoading = 5;
    
    // Seasonal Factors (Simulated logic based on Current Date)
    const currentMonth = new Date().getMonth();
    let seasonal = -3; // Default Winter/Clear
    if (currentMonth >= 5 && currentMonth <= 8) seasonal = 15; // Monsoon (Jun-Sep)
    else if (currentMonth >= 2 && currentMonth <= 4) seasonal = 8; // Summer (Mar-May)
    
    // Fraud Risk Penalty
    let fraudPenalty = 0;
    if (userProfile.fraudRiskScore > 0.6) fraudPenalty = 25;
    else if (userProfile.fraudRiskScore > 0.4) fraudPenalty = 10;
    
    let final = base + earningsAdj + riskLoading + seasonal + fraudPenalty;
    if (final < 15) final = 15;
    if (final > 70) final = 70;
    
    return {
      base,
      seasonal,
      riskLoading,
      earningsAdj,
      fraudPenalty,
      final,
      maxWeeklyPayout: DISRUPTIONS.reduce((max, d) => Math.max(max, d.maxPayout), 0)
    };
  }
}

// ==========================================
// BUSINESS LOGIC: FRAUD DETECTION ENGINE
// ==========================================

class FraudDetectionEngine {
  constructor(claim, userProfile, contextData) {
    this.claim = claim;
    this.userProfile = userProfile;
    this.contextData = contextData; // Includes active devices, network clusters
  }

  // Helper: Haversine distance in KM
  _getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
  }

  // Layer 1: Behavioral Geofencing
  validateGeofence() {
    // Check if current claim location is near historical zones
    let minDistance = 9999;
    this.userProfile.historicalLocations?.forEach(loc => {
      const dist = this._getDistanceFromLatLonInKm(this.claim.lat, this.claim.lng, loc.lat, loc.lng);
      if (dist < minDistance) minDistance = dist;
    });
    
    // Distance > 20km = anomaly
    let score = minDistance > 20 ? 0.3 : (minDistance / 20) * 0.15;
    return Math.min(score, 0.3);
  }

  // Layer 2: Device Fingerprinting
  validateDeviceFingerprint() {
    const dev = this.claim.deviceInfo || {};
    let score = 0;
    if (dev.isRooted) score += 0.15;
    if (dev.mockLocationEnabled) score += 0.25;
    if (dev.deviceId !== this.userProfile.primaryDeviceId) score += 0.05;
    return Math.min(score, 0.25);
  }

  // Layer 3: Temporal Anomaly Detection
  validateTemporalPattern() {
    const recent = this.userProfile.claims.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (recent.length === 0) return 0;
    
    const lastClaimTime = new Date(recent[0].timestamp);
    const timeDiffMs = new Date(this.claim.timestamp) - lastClaimTime;
    const hoursDiff = timeDiffMs / (1000 * 60 * 60);
    
    // Impossible travel: claiming far away too quickly
    if (hoursDiff < 1) {
       const dist = this._getDistanceFromLatLonInKm(this.claim.lat, this.claim.lng, recent[0].lat, recent[0].lng);
       if (dist > 50) return 0.3; // Impossible travel speed
    }
    
    // Frequency spike
    if (recent.length > 5 && hoursDiff < 48) return 0.2;
    return 0;
  }

  // Layer 4: Network Fraud Detection (Sybil / Ring attack)
  validateNetworkPattern() {
    // Check if many claims originate from exact same IP or coordinate
    let overlapCount = 0;
    this.contextData.recentClaims?.forEach(rc => {
      if (rc.userId !== this.userProfile.userId) {
        const dist = this._getDistanceFromLatLonInKm(this.claim.lat, this.claim.lng, rc.lat, rc.lng);
        if (dist === 0 && rc.ip === this.claim.ip) overlapCount++;
      }
    });
    
    if (overlapCount > 10) return 0.15; // Mass spoofing event
    if (overlapCount > 3) return 0.08;
    return 0;
  }

  // Layer 5: Behavioral Biometrics
  validateBehavioralPattern() {
    // Simulated Z-score analysis of user tap/swipe interaction
    const zScore = this.claim.interactionZScore || 0;
    if (zScore > 3.0 || zScore === 0.0) return 0.15; // Synthetic/Bot perfect interaction
    if (zScore > 2.0) return 0.05;
    return 0;
  }

  // Layer 6: Proof of Life
  validateProofOfLife() {
    // Did they fail a random camera/gyro check?
    if (this.claim.proofOfLifeFailed) return 0.15;
    return 0;
  }

  calculateFraudScore() {
    const l1 = this.validateGeofence();
    const l2 = this.validateDeviceFingerprint();
    const l3 = this.validateTemporalPattern();
    const l4 = this.validateNetworkPattern();
    const l5 = this.validateBehavioralPattern();
    const l6 = this.validateProofOfLife();

    const totalScore = l1 + l2 + l3 + l4 + l5 + l6;
    
    let decision = 'auto-approve';
    if (totalScore >= 0.7) decision = 'reject';
    else if (totalScore >= 0.4) decision = 'manual-review';

    return {
      totalScore: parseFloat(totalScore.toFixed(2)),
      breakdown: {
        geofence: l1,
        deviceCheck: l2,
        temporal: l3,
        network: l4,
        behavioral: l5,
        proofOfLife: l6
      },
      decision
    };
  }
}

// ==========================================
// MOCK DATA GENERATOR
// ==========================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const generateMockProfile = (phone) => ({
  userId: generateId(),
  name: 'Raj Kumar',
  phone: phone,
  zone: 'Indiranagar',
  platform: 'Swiggy',
  weeklyEarnings: 4500,
  fraudRiskScore: 0.1,
  primaryDeviceId: generateId(),
  historicalLocations: [
    { lat: 12.9784, lng: 77.6408 }, // Indiranagar
    { lat: 12.9716, lng: 77.5946 }  // Central
  ],
  policies: [],
  claims: []
});

const generateMockClaimsDataForAnalytics = () => {
  const data = [];
  const today = new Date();
  for(let i=6; i>=0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      claims: Math.floor(Math.random() * 50) + 10,
      approved: Math.floor(Math.random() * 40) + 5,
      rejected: Math.floor(Math.random() * 10)
    });
  }
  return data;
};

// ==========================================
// UI COMPONENTS
// ==========================================

const Button = ({ children, onClick, variant = 'primary', className = '', disabled=false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex justify-center items-center gap-2";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type }) => {
  const colors = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[type] || colors.info}`}>
      {children}
    </span>
  );
};

// ==========================================
// PAGES
// ==========================================

const LoginPage = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (phone.length >= 10) {
      onLogin(phone);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
      
      <Card className="w-full max-w-md p-8 relative z-10 bg-slate-800/80 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 mb-4">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            InsureFlow
          </h1>
          <p className="text-slate-400 mt-2 text-center text-sm">Parametric Income Protection for India's Gig Workforce</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">+91</span>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-14 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="98765 43210"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full py-3 text-lg mt-4">
            Access Dashboard
          </Button>
          
          <div className="text-center mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              <ShieldAlert size={14} className="inline mr-1" />
              Guidewire DEVTrails 2026 Evaluation Build.<br/>Uses 6-Layer algorithmic fraud detection.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

const HomePage = ({ user, createPolicy, triggerClaim }) => {
  const currentPolicy = user.policies.length > 0 ? user.policies[user.policies.length - 1] : null;
  const isProtected = currentPolicy && currentPolicy.status === 'ACTIVE';
  
  const [selectedDisruption, setSelectedDisruption] = useState(DISRUPTIONS[0]);
  const [simulating, setSimulating] = useState(false);

  const premiumDetails = useMemo(() => PremiumCalculator.calculateWeeklyPremium(user), [user]);

  const handleTrigger = () => {
    setSimulating(true);
    setTimeout(() => {
      triggerClaim(selectedDisruption);
      setSimulating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Hero Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-800/50 border-slate-700/50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Hello, {user.name}</h2>
              <div className="flex items-center text-slate-400 gap-4 text-sm mt-2">
                <span className="flex items-center gap-1"><MapPin size={16}/> {user.zone}</span>
                <span className="flex items-center gap-1"><Smartphone size={16}/> {user.platform}</span>
              </div>
            </div>
            {isProtected ? (
              <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2 border border-emerald-500/30">
                <ShieldCheck size={20} />
                <span className="font-semibold">Protected</span>
              </div>
            ) : (
              <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500/30">
                <ShieldAlert size={20} />
                <span className="font-semibold">Unprotected</span>
              </div>
            )}
          </div>
          
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <div className="text-slate-400 text-xs mb-1">Weekly Earnings Avg</div>
              <div className="text-xl font-bold text-white">₹{user.weeklyEarnings}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <div className="text-slate-400 text-xs mb-1">Dynamic Premium</div>
              <div className="text-xl font-bold text-blue-400">₹{premiumDetails.final}/wk</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <div className="text-slate-400 text-xs mb-1">Max Payout</div>
              <div className="text-xl font-bold text-emerald-400">₹{premiumDetails.maxWeeklyPayout}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-red-500/20">
              <div className="text-red-400 text-xs mb-1">Fraud Risk Score</div>
              <div className="text-xl font-bold text-red-400">{user.fraudRiskScore.toFixed(2)}</div>
            </div>
          </div>
          
          {!isProtected && (
            <div className="mt-6 border-t border-slate-700 pt-6">
              <Button onClick={createPolicy} className="w-full sm:w-auto px-8 gap-3 text-lg shadow-blue-500/40">
                <ShieldCheck size={22} />
                Activate Weekly Protection for ₹{premiumDetails.final}
              </Button>
            </div>
          )}
        </Card>

        {/* Live Disruption Simulator */}
        <Card className="p-6 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="text-blue-400" />
            Oracle Simulator
          </h3>
          <p className="text-sm text-slate-400 mb-6">Trigger a simulated parametric event to test zero-touch payouts and fraud detection.</p>
          
          <div className="space-y-4">
            <select 
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-blue-500"
              value={selectedDisruption.id}
              onChange={(e) => setSelectedDisruption(DISRUPTIONS.find(d => d.id === e.target.value))}
            >
              {DISRUPTIONS.map(d => (
                <option key={d.id} value={d.id}>{d.type} ({d.threshold}) - Max ₹{d.maxPayout}</option>
              ))}
            </select>
            
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Location Validation</span>
                <span className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle size={14}/> Match</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Predicted Payout</span>
                <span className="text-amber-400 font-bold">₹{selectedDisruption.maxPayout}</span>
              </div>
            </div>

            <Button 
              onClick={handleTrigger} 
              disabled={!isProtected || simulating} 
              variant="danger" 
              className={`w-full ${!isProtected ? 'opacity-30' : ''}`}
            >
              {simulating ? 'Processing Oracle Data...' : 'Trigger Parametric Event'}
            </Button>
            {!isProtected && <p className="text-xs text-center text-red-400 mt-2">Activate protection to use simulator</p>}
          </div>
        </Card>
      </div>

      {/* Recent Claims Widget */}
      <h3 className="text-xl font-bold text-white mt-8 mb-4">Recent Claims History</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {user.claims.length === 0 ? (
          <div className="col-span-full p-8 text-center border border-dashed border-slate-700 rounded-xl text-slate-500">
            No claims filed yet. Trigger an event above.
          </div>
        ) : (
          user.claims.slice().reverse().map(claim => (
            <Card key={claim.id} className="p-5 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-700 rounded-lg text-blue-400">
                    {DISRUPTIONS.find(d => d.type === claim.disruptionType)?.icon || <AlertTriangle size={16}/>}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{claim.disruptionType}</div>
                    <div className="text-xs text-slate-400">{new Date(claim.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                <div className="text-xl font-bold text-emerald-400">₹{claim.amount}</div>
                <Badge type={
                  claim.status === 'APPROVED' ? 'success' : 
                  claim.status === 'REJECTED' ? 'danger' : 'warning'
                }>
                  {claim.status}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const ClaimsPage = ({ user }) => {
  const sortedClaims = user.claims.slice().reverse();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800 p-6 border border-slate-700 rounded-xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-white">Claims Ledger</h2>
          <p className="text-slate-400">Zero-touch parametric payout history</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Total Indemnified</div>
          <div className="text-3xl font-bold text-emerald-400">
            ₹{sortedClaims.filter(c => c.status === 'APPROVED').reduce((acc, c) => acc + c.amount, 0)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedClaims.length === 0 ? (
          <div className="text-center p-12 bg-slate-800 border-dashed border border-slate-700 rounded-xl text-slate-500">
            No claims generated.
          </div>
        ) : (
          sortedClaims.map(claim => (
            <Card key={claim.id} className="p-0 overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      claim.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 
                      claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {claim.disruptionType}
                        <Badge type={
                          claim.status === 'APPROVED' ? 'success' : 
                          claim.status === 'REJECTED' ? 'danger' : 'warning'
                        }>{claim.status}</Badge>
                      </h4>
                      <div className="text-sm text-slate-400 font-mono mt-1">ID: {claim.id} • {new Date(claim.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-slate-400 text-xs mb-1">Automated Settlement</div>
                    <div className={`text-2xl font-bold ${
                      claim.status === 'REJECTED' ? 'text-slate-500 line-through' : 'text-emerald-400'
                    }`}>
                      ₹{claim.amount}
                    </div>
                  </div>
                </div>

                {/* 6-Layer Fraud Analysis Breakdown */}
                <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-400"/> 
                      6-Layer Adversarial Defense Report
                    </h5>
                    <div className="text-xs">
                      Total Risk: <span className={`font-bold ${claim.fraudAnalysis.totalScore > 0.6 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {claim.fraudAnalysis.totalScore}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Geofence</div>
                      <div className={claim.fraudAnalysis.breakdown.geofence > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.geofence.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Device</div>
                      <div className={claim.fraudAnalysis.breakdown.deviceCheck > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.deviceCheck.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Temporal</div>
                      <div className={claim.fraudAnalysis.breakdown.temporal > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.temporal.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Network</div>
                      <div className={claim.fraudAnalysis.breakdown.network > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.network.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Behavior</div>
                      <div className={claim.fraudAnalysis.breakdown.behavioral > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.behavioral.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">Proof-Of-Life</div>
                      <div className={claim.fraudAnalysis.breakdown.proofOfLife > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                        {claim.fraudAnalysis.breakdown.proofOfLife.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const mockData = useMemo(() => generateMockClaimsDataForAnalytics(), []);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="text-slate-400 text-sm mb-1">Active Protected Users</div>
          <div className="text-3xl font-bold text-white">12,458</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +4.2% this week</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-purple-500">
          <div className="text-slate-400 text-sm mb-1">Total Premium Pool</div>
          <div className="text-3xl font-bold text-white">₹3.8L</div>
          <div className="text-xs text-slate-500 mt-2">Cycle: Mar 15 - Mar 21</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="text-slate-400 text-sm mb-1">Automated Payouts</div>
          <div className="text-3xl font-bold text-white">₹1.2L</div>
          <div className="text-xs text-emerald-400 mt-2">Zero human intervention</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-red-500">
          <div className="text-slate-400 text-sm mb-1">Fraud Attempts Blocked</div>
          <div className="text-3xl font-bold text-white">492</div>
          <div className="text-xs text-red-400 mt-2 flex items-center gap-1"><ShieldAlert size={12}/> ₹142k protected</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-6">7-Day Disruption Volume vs Settlement</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Legend />
                <Area type="monotone" dataKey="claims" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClaims)" name="Total Triggers" />
                <Area type="monotone" dataKey="approved" stroke="#10b981" fillOpacity={0} name="Approved Payouts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-6">Fraud Ring Neutralization (By Layer)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'L1: Geofence', blocks: 120 },
                { name: 'L2: Device', blocks: 250 },
                { name: 'L3: Temporal', blocks: 45 },
                { name: 'L4: Network', blocks: 76 },
                { name: 'L5: Behavior', blocks: 20 },
                { name: 'L6: Life Check', blocks: 15 },
              ]} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Bar dataKey="blocks" fill="#ef4444" radius={[0, 4, 4, 0]} name="Blocked Instances" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};


// ==========================================
// MAIN APP ROUTER & STATE PROVIDER
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isToastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ----------------------------------------
  // ACTIONS & LOGIC
  // ----------------------------------------

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const loginUser = (phone) => {
    // Generate mock profile with persistence simulation
    const profile = generateMockProfile(phone);
    setUser(profile);
    showToast('Authenticated securely.');
  };

  const logoutUser = () => {
    setUser(null);
  };

  const createPolicy = () => {
    if (!user) return;
    
    const premiumDetails = PremiumCalculator.calculateWeeklyPremium(user);
    
    const newPolicy = {
      id: `POL-${generateId().toUpperCase()}`,
      status: 'ACTIVE',
      premiumPaid: premiumDetails.final,
      maxPayout: premiumDetails.maxWeeklyPayout,
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    const updatedUser = { ...user, policies: [...user.policies, newPolicy] };
    setUser(updatedUser);
    showToast(`Protected for 7 days. Premium ₹${premiumDetails.final} deducted.`);
  };

  const triggerClaim = (disruption) => {
    if (!user) return;

    // Simulate contextual data points for Fraud Engine
    const mockContext = {
      recentClaims: [], // In reality this queries active network graphs
    };

    // Construct raw claim data
    const rawClaim = {
      id: `CLM-${generateId().toUpperCase()}`,
      disruptionType: disruption.type,
      amount: disruption.maxPayout,
      timestamp: new Date().toISOString(),
      lat: 12.9784 + (Math.random() * 0.01 - 0.005), // near Indiranagar
      lng: 77.6408 + (Math.random() * 0.01 - 0.005),
      ip: `192.168.1.${Math.floor(Math.random()*255)}`,
      deviceInfo: {
        isRooted: Math.random() > 0.9, // 10% chance mock device is rooted
        mockLocationEnabled: Math.random() > 0.9,
        deviceId: user.primaryDeviceId
      },
      interactionZScore: 1.2
    };

    // Process through 6-Layer Fraud Engine
    const fraudEngine = new FraudDetectionEngine(rawClaim, user, mockContext);
    const analysis = fraudEngine.calculateFraudScore();
    
    // Finalize claim status based on decision
    rawClaim.status = analysis.decision === 'reject' ? 'REJECTED' : 
                      analysis.decision === 'manual-review' ? 'UNDER_REVIEW' : 'APPROVED';
                      
    rawClaim.fraudAnalysis = analysis;
    
    const updatedUser = { ...user, claims: [...user.claims, rawClaim] };
    
    // Recalculate fraud risk score for user profile
    const historicalFails = updatedUser.claims.filter(c => c.status === 'REJECTED').length;
    updatedUser.fraudRiskScore = Math.min(historicalFails * 0.2 + 0.1, 1.0);
    
    setUser(updatedUser);
    
    if (rawClaim.status === 'APPROVED') {
      showToast(`Parametric match! ₹${rawClaim.amount} dispatched via IMPS.`);
    } else if (rawClaim.status === 'REJECTED') {
      showToast(`Warning: Claim rejected. Fraud Score: ${analysis.totalScore}.`);
    } else {
      showToast(`Claim queued for secondary review.`);
    }
  };


  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  if (!user) {
    return <LoginPage onLogin={loginUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 flex flex-row md:flex-col shrink-0">
        <div className="p-4 md:p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 hidden md:block">
            InsureFlow
          </span>
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-visible px-2 md:px-4 py-2 gap-1 md:gap-2">
          {[{ id: 'home', icon: <Home size={18}/>, label: 'Dashboard' },
            { id: 'claims', icon: <Activity size={18}/>, label: 'Claims Ledger' },
            { id: 'analytics', icon: <PieChartIcon size={18}/>, label: 'Ecosystem Analytics' },
            { id: 'settings', icon: <Settings size={18}/>, label: 'Context Settings' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 hidden md:block border-t border-slate-700">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User size={16}/></div>
              <div>
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-slate-500">{user.phone}</div>
              </div>
            </div>
            <Button onClick={logoutUser} variant="secondary" className="w-full text-xs py-1.5">
              <LogOut size={14}/> Disconnect
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900 relative">
        {/* Toast Notification */}
        {isToastVisible && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-blue-500 shadow-xl shadow-black/50 rounded-lg p-4 flex items-center gap-3 max-w-sm">
              <ShieldCheck className="text-blue-400" />
              <p className="text-sm font-medium text-white">{toastMessage}</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {activeTab === 'home' && <HomePage user={user} createPolicy={createPolicy} triggerClaim={triggerClaim} />}
          {activeTab === 'claims' && <ClaimsPage user={user} />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Simulation Environment Controls</h3>
                <p className="text-slate-400 mb-6 text-sm">
                  Adjust local profile variables to test how the AI risk engine reacts dynamically.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Gig Platform</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                      value={user.platform}
                      onChange={(e) => setUser({...user, platform: e.target.value})}
                    >
                      {DELIVERY_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Operation Zone (Affects Base Premium)</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                      value={user.zone}
                      onChange={(e) => setUser({...user, zone: e.target.value})}
                    >
                      {ZONES.map(z => <option key={z.name}>{z.name} (Tier {z.tier})</option>)}
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
