# 🌐 Bharat Mandi Web UI Guide

## Access the UI

Open your browser and navigate to:
```
http://localhost:3000
```

## How to Use

The UI provides a step-by-step workflow to test the complete Bharat Mandi POC:

### Step 1: Create Users
1. Fill in farmer details (pre-filled with defaults)
2. Click "Create Farmer"
3. Fill in buyer details (pre-filled with defaults)
4. Click "Create Buyer"

### Step 2: Grade Produce
1. Select produce type (Wheat, Rice, Tomato, etc.)
2. Enter GPS coordinates (pre-filled with Punjab location)
3. Click "Grade Produce"
4. View the AI-generated grade (A/B/C) and confidence score

### Step 3: Create Listing
1. Enter quantity in kg (default: 1000)
2. Enter price per kg (default: ₹25)
3. Click "Create Listing"
4. The total amount is automatically calculated

### Step 4: Buyer Purchase
1. Review the amount
2. Click "Initiate Purchase"
3. Transaction is created with PENDING status

### Step 5: Transaction Flow
Follow the buttons in sequence:
1. **Farmer Accepts Order** → Status: ACCEPTED, Escrow created
2. **Buyer Locks Payment** → Status: PAYMENT_LOCKED, Funds secured
3. **Farmer Dispatches** → Status: IN_TRANSIT
4. **Buyer Confirms Delivery** → Status: DELIVERED
5. **Release Funds** → Status: COMPLETED, Transaction complete! 🎉

### Step 6: View Data
- **View All Users**: See all registered farmers and buyers
- **View All Listings**: See all marketplace listings
- **View Transaction Details**: See complete transaction information

## Features

### Status Bar
The top status bar shows real-time information:
- Farmer ID
- Buyer ID
- Certificate ID
- Listing ID
- Transaction ID
- Transaction Status (with color-coded badges)

### Color-Coded Status Badges
- 🟡 PENDING - Yellow
- 🔵 ACCEPTED - Blue
- 🟠 PAYMENT_LOCKED - Orange
- 🟣 IN_TRANSIT - Purple
- 🟢 DELIVERED - Green
- ✅ COMPLETED - Dark Green

### Auto-Enable Buttons
Buttons are automatically enabled/disabled based on workflow progress:
- Grade button enables after farmer is created
- Listing button enables after grading is complete
- Purchase button enables after listing is created
- Transaction flow buttons enable sequentially

## Tips

1. **Follow the sequence**: Each step must be completed before the next
2. **Check status bar**: Monitor IDs and transaction status in real-time
3. **View results**: Each action shows success/error messages
4. **Explore data**: Use Step 6 to view all data in JSON format
5. **Refresh to restart**: Reload the page to start a new workflow

## Troubleshooting

### Button is disabled
- Make sure you completed the previous step
- Check the status bar to see what's missing

### Error messages
- Red error boxes show what went wrong
- Check that the server is running on port 3000
- Verify all required fields are filled

### Server not responding
- Make sure the server is running: `npm run dev`
- Check console for any error messages
- Verify port 3000 is not blocked

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Backend**: Node.js + Express + TypeScript
- **API**: RESTful endpoints at `/api/*`
- **Database**: In-memory (data resets on server restart)

Enjoy testing the Bharat Mandi POC! 🌾
