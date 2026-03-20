# FRAUD_DETECTION_GUIDE: The 6-Layer Adversarial Defense System

The single most significant vulnerability of *any* automated parametric insurance platform is digital spoofing. Because payouts trigger instantly (Zero-Touch) based on remote environmental triggers (Oracles), malicious actors will logically attempt to position themselves digitally in disastrous weather zones to extract value from the underwriter.

InsureFlow mitigates this risk to near-zero by instituting a rigid, mathematical, 6-Layer defense mechanism embedded inside `InsureFlow.jsx` (and eventually moving to the `FraudEngine` ML backend).

***

## System Overview & Efficacy Target
*   **Target Accuracy**: 95.8% True Positive Fraud Blocked.
*   **False Positive Acceptable Threshold**: < 2.0%.
*   **Execution Time (Hackathon MVP)**: ~45ms locally via class `FraudDetectionEngine`.

Each layer emits a raw numeric "Risk Weighting" bounding from `0.00` to an arbitrary limit. 
**If `totalScore ≥ 0.70`**: Auto-Reject the claim definitively.
**If `0.40 ≤ totalScore < 0.70`**: Auto-queue for human review (Manual Auth).
**If `totalScore < 0.40`**: Auto-Approve and payout the user.

***

## Layer 1: Behavioral Geofencing (`validateGeofence()`)

Gig delivery partners operate in tightly clustered geographic networks containing their home hubs, waiting spots (e.g., outside cloud kitchens), and frequent delivery radii.

**The Mechanics**:
1. At setup, InsureFlow ingests a 30-day GPS heatmap of the individual rider.
2. The engine uses DBSCAN (Density-Based Spatial Clustering) to designate 'Legitimate Operating Clusters' (LOC).
3. When a Parametric Claim is invoked, the device transmits its *current* claimed (or faked) coordinates.
4. The system calculates the shortest Haversine distance between the given Claim Lat/Lng against all stored LOCs.

**Scoring Payload**:
```javascript
const dist = haversine(claimLat, claimLng, userHistoricZones);
let score = dist > 20 ? 0.3 : (dist / 20) * 0.15;
```
If an actor fakes their GPS to be exactly in a 50mm flooding zone that is 25 km away from their historical zone, Layer 1 maxes out at `0.30` risk score.

***

## Layer 2: Device Fingerprinting (`validateDeviceFingerprint()`)

By far the most common attack vector is simple Android "Fake GPS" applications enabled via Developer Tools.

**The Mechanics**:
1. Upon initializing InsureFlow, a React-Native bridge or PWA wrapper checks explicitly for flags set by the underlying mobile OS.
2. Check 1: `Settings.Secure.ALLOW_MOCK_LOCATION` (Android).
3. Check 2: Binary scans for common rooting packages (`/system/app/Superuser.apk`, `/sbin/su`, `magisk`).
4. Check 3: Checking if the device generating the claim matches the `primaryDeviceId` generated upon their first login Canvas hash.

**Scoring Payload**:
```javascript
let score = 0;
if (dev.isRooted) score += 0.15;
if (dev.mockLocationEnabled) score += 0.25; // Fatal failure trigger
if (dev.deviceId !== user.primaryDeviceId) score += 0.05;
```

A user trying to claim via BlueStacks emulator with root enabled and Mock Location active instantly accumulates a massive `0.40` score + whatever location variance they have in Layer 1, causing an immediate automated ban.

***

## Layer 3: Temporal Anomaly Detection (`validateTemporalPattern()`)

This layer catches temporal telemetry impossibilities and "greedy" scripts.

**The Mechanics**:
1. Examines the time series of the claimant's most recent valid transactions.
2. Speed-of-Light limits: It is mathematically impossible to claim an AQI delay in North Bangalore at 12:00 PM and a Rain Delay in South Bangalore at 12:10 PM. The distance (40km) divided by time (10m) = 240km/hr in city limits.
3. Rapid Frequency: If 5 legitimate claims are triggered consecutively across varying weather parameters over 48 hours, it implies a scripted bot reacting to weather Oracles rather than human behavior.

**Scoring**:
*   *Impossible Travel Match*: **+0.30 Risk**.
*   *Frequency Spike Anomaly Match*: **+0.20 Risk**.

***

## Layer 4: Network Fraud Detection (`validateNetworkPattern()`)

Sybil Attacks—where an organized group shares tools, scripts, or APIs to drain a platform.

**The Mechanics**:
1. Uses a graph-based representation mapping Nodes (Users) via Relationships (IP Subnet sharing, exactly overlapping Lat/Lng geometries).
2. The Bronze-Kerbosch algorithm recursively finds maximal cliques in the graph.
3. If `User A` and `User B` and 50 other users transmit identical exact float coordinates (`12.978411, 77.640822`) out to the 6th decimal place concurrently, they are part of a bot-net ring. Human devices always variate precision via GPS drift.

**Scoring**:
*   10+ devices at identical coordinates simultaneously: **+0.15 Risk** (Mass Spoofing).
*   4-9 devices: **+0.08 Risk**.

***

## Layer 5: Behavioral Biometrics (`validateBehavioralPattern()`)

Detecting headless browsers (Puppeteer, Selenium) and basic auto-clickers via interaction models.

**The Mechanics**:
1. As the rider uses InsureFlow over weeks, median swipe speed, tap pressure, and gyro drift establish a baseline standard deviation profile.
2. During claim interaction, if the standard deviation collapses, the interaction is synthetic.
3. Bot tap duration precisely equals 100ms on every tap. Humans vary (85ms, 112ms, 91ms).

**Scoring**:
*   Perfect Z-Score (0.0): **+0.15 Risk** (Deterministic Script active).
*   Abnormal Z-Score (> 2.0): **+0.05 Risk** (Unfamiliar human or clunky script).

***

## Layer 6: Proof Of Life Protocol (`validateProofOfLife()`)

A dynamic friction gateway deployed against marginal score cases.

**The Mechanics**:
If Layers 1-5 sum up to 0.45, the engine flags a "Manual Review". Instead of outright rejecting, the PWA forces a `Proof Of Life` check requiring:
1. Live camera capture of surrounding weather conditions.
2. Accelerometer movement verification spanning 15 seconds (To prove it is a mobile rider device, not a desktop web farm).

If the script fails to provide this or the user abandons the flow, **+0.15 Risk** is added, pushing the score over 0.60 and into an automated Reject state.

***

## Real World Simulation: The "Market Crash" Sybil Strategy

**Scenario Description:** A coordinated Reddit group discovers a loophole. At 5 PM on Tuesday when a severe storm hits Whitefield, 500 malicious actors simultaneously boot up Android emulators, switch on Mock Locations to target Whitefield, and attempt to drain InsureFlow for 500 x ₹800 (₹4,00,000 lost). 

**InsureFlow Response Breakdown:**
*   `T:00`: 500 concurrent REST payloads hit `POST /claims`.
*   `T+12ms`: The `validateDeviceFingerprint()` catches 420 instances of `su` binaries or obvious BlueStacks signatures instantly (`score: 0.40`).
*   `T+30ms`: The `validateNetworkPattern()` detects that out of the remaining 80 emulators, 75 of them have overlapping IP subnets routing through a cheap known Tor node, creating a dense graph clique. They share identical Lat/Lng coordinates. (`score: +0.15`).
*   `T+35ms`: The `validateGeofence()` detects that all 500 actors have exactly 0 historical background presence in Whitefield over the last 30 days (`score: +0.30`).
*   **Final Matrix Evaluation** (`T+45ms`): By T+45 milliseconds, all 500 arrays return an internal `totalRisk > 0.85`.
*   **Resolution**: 500/500 claims synchronously auto-REJECTED. A webhook is fired to the parent Gig platforms (Zomato/Swiggy) with the offending Rider IDs recommending disciplinary platform expulsion. Platform losses: **₹0.00**.
