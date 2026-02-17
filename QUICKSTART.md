# Quick Start Guide

Get the Bharat Mandi POC running in 3 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 Bharat Mandi POC server running on port 3000
📍 Health check: http://localhost:3000/api/health
```

## 3. Test the API

Open a new terminal and run:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 4. Try the Complete Workflow

Follow the step-by-step guide in `examples/workflow-demo.md` to test the complete farmer-to-buyer workflow.

## Quick Test Commands

### Create a Farmer
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Farmer","phone":"+919999999999","type":"FARMER","location":"Test Location"}'
```

### View All Users
```bash
curl http://localhost:3000/api/users
```

### Grade Produce
```bash
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{"farmerId":"<farmer-id>","produceType":"Wheat","imageData":"test","location":{"lat":30.7,"lng":76.7}}'
```

## Run Tests

```bash
npm test
```

## Next Steps

1. Review the API documentation in `README.md`
2. Follow the complete workflow in `examples/workflow-demo.md`
3. Explore the code structure in `src/`

## Troubleshooting

**Port already in use?**
```bash
# Use a different port
PORT=3001 npm run dev
```

**TypeScript errors?**
```bash
# Rebuild
npm run build
```

## Need Help?

Check the main `README.md` for detailed documentation.
