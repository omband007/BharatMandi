# Manual Registration Test

## Step 1: Register
```bash
curl -X POST http://localhost:3000/api/v1/profiles/register \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543211"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "userId": "+919876543211",
    "otpSent": true
  }
}
```

Check server console for OTP (e.g., `[Registration] OTP for +919876543211: 123456`)

## Step 2: Verify OTP with Mandatory Fields
```bash
curl -X POST http://localhost:3000/api/v1/profiles/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "+919876543211",
    "otp": "123456",
    "name": "Test Farmer",
    "userType": "farmer",
    "location": {
      "type": "gps",
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "profile": {
      "userId": "...",
      "name": "Test Farmer",
      "userType": "farmer",
      "location": {...},
      "completionPercentage": 40,
      ...
    },
    "token": "eyJ..."
  }
}
```

## Step 3: Setup PIN
```bash
curl -X POST http://localhost:3000/api/v1/profiles/auth/setup-pin \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId_from_step2>",
    "pin": "1234",
    "confirmPin": "1234"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "PIN set up successfully"
}
```
