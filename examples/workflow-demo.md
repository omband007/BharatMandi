# Complete Workflow Demo

This document demonstrates the complete farmer-to-buyer workflow using the POC API.

## Prerequisites

Start the server:
```bash
npm run dev
```

## Step-by-Step Workflow

### Step 1: Create Farmer Account

**Request:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ramesh Kumar",
    "phone": "+919876543210",
    "type": "FARMER",
    "location": "Punjab, India"
  }'
```

**Response:**
```json
{
  "id": "farmer-uuid-123",
  "name": "Ramesh Kumar",
  "phone": "+919876543210",
  "type": "FARMER",
  "location": "Punjab, India",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

Save the `id` as `FARMER_ID`.

---

### Step 2: Create Buyer Account

**Request:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suresh Traders",
    "phone": "+919876543211",
    "type": "BUYER",
    "location": "Delhi, India"
  }'
```

**Response:**
```json
{
  "id": "buyer-uuid-456",
  "name": "Suresh Traders",
  "phone": "+919876543211",
  "type": "BUYER",
  "location": "Delhi, India",
  "createdAt": "2024-01-15T10:05:00.000Z"
}
```

Save the `id` as `BUYER_ID`.

---

### Step 3: Farmer Grades Produce

**Request:**
```bash
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer-uuid-123",
    "produceType": "Wheat",
    "imageData": "base64_encoded_image_data_here",
    "location": {
      "lat": 30.7333,
      "lng": 76.7794
    }
  }'
```

**Response:**
```json
{
  "gradingResult": {
    "grade": "A",
    "confidence": 0.92,
    "timestamp": "2024-01-15T10:10:00.000Z",
    "location": {
      "lat": 30.7333,
      "lng": 76.7794
    }
  },
  "certificate": {
    "id": "cert-uuid-789",
    "farmerId": "farmer-uuid-123",
    "produceType": "Wheat",
    "grade": "A",
    "timestamp": "2024-01-15T10:10:00.000Z",
    "location": {
      "lat": 30.7333,
      "lng": 76.7794
    },
    "imageHash": "hash_1705315800000"
  }
}
```

Save the `certificate.id` as `CERTIFICATE_ID`.

---

### Step 4: Farmer Creates Listing

**Request:**
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer-uuid-123",
    "produceType": "Wheat",
    "quantity": 1000,
    "pricePerKg": 25,
    "certificateId": "cert-uuid-789"
  }'
```

**Response:**
```json
{
  "id": "listing-uuid-101",
  "farmerId": "farmer-uuid-123",
  "produceType": "Wheat",
  "quantity": 1000,
  "pricePerKg": 25,
  "certificateId": "cert-uuid-789",
  "createdAt": "2024-01-15T10:15:00.000Z",
  "isActive": true
}
```

Save the `id` as `LISTING_ID`.

---

### Step 5: Buyer Views Listings

**Request:**
```bash
curl http://localhost:3000/api/listings
```

**Response:**
```json
[
  {
    "id": "listing-uuid-101",
    "farmerId": "farmer-uuid-123",
    "produceType": "Wheat",
    "quantity": 1000,
    "pricePerKg": 25,
    "certificateId": "cert-uuid-789",
    "createdAt": "2024-01-15T10:15:00.000Z",
    "isActive": true
  }
]
```

---

### Step 6: Buyer Initiates Purchase

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "listing-uuid-101",
    "farmerId": "farmer-uuid-123",
    "buyerId": "buyer-uuid-456",
    "amount": 25000
  }'
```

**Response:**
```json
{
  "id": "txn-uuid-202",
  "listingId": "listing-uuid-101",
  "farmerId": "farmer-uuid-123",
  "buyerId": "buyer-uuid-456",
  "amount": 25000,
  "status": "PENDING",
  "createdAt": "2024-01-15T10:20:00.000Z",
  "updatedAt": "2024-01-15T10:20:00.000Z"
}
```

Save the `id` as `TRANSACTION_ID`.

---

### Step 7: Farmer Accepts Order

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions/txn-uuid-202/accept
```

**Response:**
```json
{
  "transaction": {
    "id": "txn-uuid-202",
    "listingId": "listing-uuid-101",
    "farmerId": "farmer-uuid-123",
    "buyerId": "buyer-uuid-456",
    "amount": 25000,
    "status": "ACCEPTED",
    "createdAt": "2024-01-15T10:20:00.000Z",
    "updatedAt": "2024-01-15T10:25:00.000Z"
  },
  "escrow": {
    "id": "escrow-uuid-303",
    "transactionId": "txn-uuid-202",
    "amount": 25000,
    "isLocked": false,
    "createdAt": "2024-01-15T10:25:00.000Z"
  }
}
```

---

### Step 8: Buyer Deposits and Locks Payment

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions/txn-uuid-202/lock-payment
```

**Response:**
```json
{
  "transaction": {
    "id": "txn-uuid-202",
    "status": "PAYMENT_LOCKED",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "escrow": {
    "id": "escrow-uuid-303",
    "transactionId": "txn-uuid-202",
    "amount": 25000,
    "isLocked": true,
    "createdAt": "2024-01-15T10:25:00.000Z"
  }
}
```

---

### Step 9: Farmer Dispatches Produce

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions/txn-uuid-202/dispatch
```

**Response:**
```json
{
  "id": "txn-uuid-202",
  "status": "IN_TRANSIT",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### Step 10: Buyer Confirms Delivery

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions/txn-uuid-202/deliver
```

**Response:**
```json
{
  "id": "txn-uuid-202",
  "status": "DELIVERED",
  "updatedAt": "2024-01-15T14:00:00.000Z"
}
```

---

### Step 11: Release Funds to Farmer

**Request:**
```bash
curl -X POST http://localhost:3000/api/transactions/txn-uuid-202/release-funds
```

**Response:**
```json
{
  "transaction": {
    "id": "txn-uuid-202",
    "status": "COMPLETED",
    "updatedAt": "2024-01-15T14:05:00.000Z"
  },
  "escrow": {
    "id": "escrow-uuid-303",
    "transactionId": "txn-uuid-202",
    "amount": 25000,
    "isLocked": false,
    "createdAt": "2024-01-15T10:25:00.000Z"
  }
}
```

---

## Transaction Status Flow

```
PENDING → ACCEPTED → PAYMENT_LOCKED → IN_TRANSIT → DELIVERED → COMPLETED
```

Alternative flows:
- `PENDING → REJECTED` (Farmer rejects order)
- `DELIVERED → DISPUTED` (Quality mismatch - future implementation)

---

## Summary

This workflow demonstrates:

1. ✅ User onboarding (Farmer & Buyer)
2. ✅ AI-powered produce grading
3. ✅ Digital quality certificate generation
4. ✅ Marketplace listing creation
5. ✅ Purchase request initiation
6. ✅ Order acceptance/rejection
7. ✅ Escrow account creation
8. ✅ Payment locking mechanism
9. ✅ Delivery tracking
10. ✅ Automatic fund release

All core features of the Bharat Mandi workflow are functional in this POC!
