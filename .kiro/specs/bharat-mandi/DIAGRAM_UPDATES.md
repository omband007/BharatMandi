# Diagram Updates Summary

This document tracks all diagram updates made to the design.md file to reflect the new requirements (Requirements 19-30).

## Update Status: ✅ COMPLETE

All diagrams have been updated to include the 12 new features added in Requirements 19-30.

---

## 1. Use Case Diagram - ✅ UPDATED

**Status**: Complete

**Changes Made**:
- Added 25 new use cases (UC10-UC12, UC22-UC30, UC45-UC47, UC55-UC62)
- Added 2 new actors: Government Agency, Dairy/Poultry Farm
- Total use cases increased from 37 to 62

**New Use Cases Added**:

Auction & Bidding (UC10-UC12):
- UC10: Create Auction Listing
- UC11: Place Bid
- UC12: Monitor Auction

Disease Diagnosis (UC22-UC24):
- UC22: Diagnose Disease
- UC23: Get Treatment Recommendations
- UC24: Buy Remedies

Crop-AI Advisor (UC25):
- UC25: Ask Crop Advisor

Soil Health (UC26):
- UC26: Record Soil Test

Smart Alerts (UC27):
- UC27: Receive Smart Alerts

Manure Marketplace (UC28-UC30):
- UC28: List Manure
- UC29: Request Maturity Test
- UC30: Buy Manure

Voice-to-Ad (UC45):
- UC45: Create Voice Ad

Government Schemes (UC46-UC47):
- UC46: Check Scheme Eligibility
- UC47: Apply for Scheme

Logistics (UC55-UC57):
- UC55: Request Route Optimization
- UC56: Join Truck Pool
- UC57: Track Vehicle Live

Traceability (UC58-UC62):
- UC58: Record Farm Activity
- UC59: Link Quality Certificate
- UC60: Track Shipment
- UC61: Generate QR Code
- UC62: Verify Product Journey

---

## 2. High-Level Architecture Diagram - ✅ UPDATED

**Status**: Complete

**Changes Made**:
- Added 7 new backend services
- Enhanced Edge AI capabilities
- Added GPS Tracker integration
- Added Weather API integration
- Added Government Schemes Database

**New Components Added**:

Backend Services:
- Disease Diagnosis Service
- Soil Health Service
- Smart Alerts Service
- Scheme Eligibility Service
- Route Optimization Service
- Live Tracking Service
- Traceability Service

Edge AI Enhancements:
- Disease Detection Model
- Manure Maturity Model
- Voice-to-Ad Generation

External Integrations:
- GPS Tracker (for live vehicle tracking)
- Weather API (for smart alerts)
- Government Schemes DB (for eligibility matching)

---

## 3. Process Flow Diagrams - ✅ UPDATED

**Status**: Complete - All 12 new process flows added

**Original Process Flows** (8):
1. Farmer Onboarding and Produce Listing Flow
2. Buyer Purchase and Smart Escrow Flow
3. Delivery Validation and Fund Release Flow
4. Photo-Log and Credibility Score Building Flow
5. Offline-to-Online Sync Flow
6. Dispute Resolution Flow
7. Kisan-Mitra Voice Assistant Flow
8. Complete Transaction Lifecycle

**NEW Process Flows Added** (12):

9. **Auction and Bidding Flow**
   - Sequence diagram showing real-time bidding process
   - Covers auction creation, bid placement, winner determination, escrow creation

10. **Disease and Pest Diagnosis Flow**
   - Flowchart showing image capture, AI analysis, diagnosis, treatment recommendations
   - Includes both chemical and organic remedy options

11. **Crop-AI Advisor Flow**
   - Flowchart showing multi-modal input (voice, text, photo, video)
   - Intent extraction, query routing, response generation with TTS

12. **Soil Health Recording Flow**
   - Flowchart showing OCR-based report scanning or manual entry
   - Trend analysis, parameter status checking, recommendations

13. **Smart Alerts and Predictive Advisory Flow**
   - Flowchart showing multi-source data monitoring
   - Contextual alert generation with priority-based delivery (voice call, push, in-app)

14. **Manure and Compost Marketplace Flow**
   - Sequence diagram showing listing creation, maturity test request, order placement
   - Includes logistics coordination and payment release

15. **Manure Maturity Test Flow**
   - Flowchart showing AI-based visual analysis
   - Color, texture, moisture, odor scoring with maturity determination

16. **Voice-to-Ad Generation Flow**
   - Flowchart showing voice recording, STT, NLU, entity extraction
   - Auto-generation of rich classified ad with photo enhancement

17. **Government Scheme Eligibility Flow**
   - Flowchart showing profile matching against scheme criteria
   - AI-based eligibility scoring, document collection, application submission

18. **Logistics Route Optimization Flow**
   - Flowchart showing TSP algorithm for multi-pickup route optimization
   - Cost savings calculation, pooling coordination

19. **Live Vehicle Tracking Flow**
   - Sequence diagram showing GPS-based real-time tracking
   - ETA calculation, delay detection, delivery confirmation

20. **End-to-End Traceability Flow**
   - Flowchart showing complete seed-to-shelf journey
   - Activity logging, QR code generation, consumer verification

**Total Process Flows**: 20 (8 original + 12 new)

---

## 4. UI Wireframes - ✅ UPDATED

**Status**: Complete - All 12 new wireframes added

**Original Wireframes** (11):
1. Language Selection Screen
2. Registration Screen
3. OTP Verification Screen
4. Farmer Dashboard
5. Fasal-Parakh (Grading) Screen
6. Marketplace Listing Screen
7. Order Details Screen
8. Photo-Log Screen
9. Credibility Score Screen
10. Kisan-Mitra Screen
11. Price Prophecy Screen
12. Notifications Screen
13. Settings Screen

**NEW Wireframes Added** (12):

12. **Auction Screen**
    - Live auction interface with countdown timer
    - Current bid display, bid history, auto-bid option

13. **Disease Diagnosis Screen**
    - Camera interface for capturing affected plant
    - Diagnosis result with confidence score
    - Treatment options (chemical/organic) with dosage info

14. **Crop-AI Advisor Screen**
    - Chat interface with voice/text/photo/video input
    - Conversational AI responses with actionable advice

15. **Soil Health Screen**
    - Latest test results with parameter status
    - Trend charts over time
    - Recommendations for amendments and suitable crops

16. **Smart Alerts Screen**
    - Priority-based alert categorization (Critical/High/Normal)
    - Actionable suggestions with each alert
    - Dismiss/snooze options

17. **Manure Marketplace Screen**
    - Listings with maturity test status
    - Distance-based filtering
    - Request test and buy options

18. **Maturity Test Result Screen**
    - Overall maturity score with breakdown
    - Color, texture, moisture, odor analysis
    - Usage recommendations and safety status

19. **Voice-to-Ad Creation Screen**
    - Voice recording interface with timer
    - Auto-generated ad preview
    - Edit and publish options

20. **Government Schemes Screen**
    - Eligibility status with profile completion
    - Categorized schemes (Eligible/Partially/Not Eligible)
    - Apply now and complete requirements options

21. **Route Optimization Screen**
    - Pooling opportunity with cost comparison
    - Map view of optimized route
    - Savings calculation

22. **Live Tracking Screen**
    - Real-time map with vehicle location
    - Journey progress bar
    - ETA and distance remaining
    - Driver contact option

23. **Traceability Screen**
    - QR code scanner
    - Complete product journey timeline
    - Verification status

**Total Wireframes**: 23 (11 original + 12 new)

---

## Summary

✅ **Use Case Diagram**: Updated with 25 new use cases and 2 new actors
✅ **Architecture Diagram**: Updated with 7 new services and integrations
✅ **Process Flows**: Added 12 new detailed process flow diagrams (Total: 20)
✅ **UI Wireframes**: Added 12 new screen wireframes (Total: 23)

**All diagrams are now complete and up-to-date with Requirements 19-30.**

---

## Files Modified

- `.kiro/specs/bharat-mandi/design.md` - All diagrams updated

## Next Steps

The design document is now fully updated with all diagrams reflecting the complete feature set (Requirements 1-30). The spec is ready for implementation.

---

**Last Updated**: February 15, 2026  
**Status**: ✅ COMPLETE
