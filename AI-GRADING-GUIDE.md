# 🤖 AI-Powered Fasal-Parakh Module

## Overview

The Fasal-Parakh module now uses real AI to analyze produce images and determine quality grades. It can detect crop types and assess quality based on visual characteristics.

## Features

### ✅ Real Image Analysis
- Upload actual photos of produce
- AI analyzes color, size, brightness, and uniformity
- Generates quality scores based on visual metrics

### ✅ Crop Detection
- Attempts to identify the crop type from the image
- Uses Hugging Face's Vision Transformer model (when available)
- Falls back to manual input if detection fails

### ✅ Quality Grading
- **Grade A**: High quality (confidence ≥ 80%)
  - Uniform color
  - Good brightness
  - No visible defects
  
- **Grade B**: Medium quality (confidence 60-80%)
  - Moderate uniformity
  - Acceptable brightness
  - Minor defects

- **Grade C**: Lower quality (confidence < 60%)
  - Non-uniform color
  - Poor brightness
  - Significant defects

### ✅ Detailed Analysis
- **Size**: Small, Medium, or Large
- **Color**: Uniform or Non-uniform
- **Defects**: None, Minor, or Significant
- **Confidence Score**: 0-100%

## How It Works

### 1. Image Upload
- User uploads a photo of their produce
- Supports JPG, PNG, and other image formats
- Maximum file size: 10MB

### 2. Image Processing
- Image is resized to 224x224 pixels
- Optimized for AI model input
- Quality preserved at 90%

### 3. AI Analysis
The system performs multiple analyses:

**Color Uniformity**
- Calculates standard deviation across color channels
- Lower deviation = more uniform = higher quality

**Brightness Analysis**
- Measures average brightness
- Optimal brightness around 128 (mid-range)
- Too dark or too bright reduces score

**Size Categorization**
- Based on image dimensions
- Large: > 40,000 pixels
- Medium: 20,000-40,000 pixels
- Small: < 20,000 pixels

### 4. Crop Detection (Optional)
- Uses Hugging Face Vision Transformer
- Identifies common crops: wheat, rice, tomato, potato, onion, corn, etc.
- Falls back to user-provided type if detection fails

### 5. Grade Calculation
```
Quality Score = (Color Uniformity × 0.4) + (Brightness × 0.6)

If Score ≥ 0.8 → Grade A
If Score ≥ 0.6 → Grade B
If Score < 0.6 → Grade C
```

## Using the UI

1. **Create Farmer** (Step 1)
2. **Upload Image** (Step 2)
   - Click "Choose File" and select a produce image
   - Optionally select produce type (or leave blank for auto-detect)
   - Enter GPS coordinates
   - Click "Grade Produce with AI"
3. **View Results**
   - Detected crop type
   - Quality grade (A/B/C)
   - Confidence percentage
   - Detailed analysis (size, color, defects)
   - Digital certificate ID

## API Endpoints

### Upload Image for Grading
```
POST /api/grading/grade-with-image
Content-Type: multipart/form-data

Fields:
- image: File (required)
- farmerId: string (required)
- produceType: string (optional)
- lat: number (required)
- lng: number (required)

Response:
{
  "gradingResult": {
    "grade": "A" | "B" | "C",
    "confidence": 0.85,
    "timestamp": "2026-02-16T...",
    "location": { "lat": 30.7333, "lng": 76.7794 }
  },
  "certificate": {
    "id": "uuid",
    "farmerId": "uuid",
    "produceType": "wheat",
    "grade": "A",
    "imageHash": "abc123..."
  },
  "analysis": {
    "detectedCrop": "wheat",
    "details": {
      "size": "Large",
      "color": "Uniform",
      "defects": "None detected"
    }
  }
}
```

### Legacy Base64 Endpoint
```
POST /api/grading/grade
Content-Type: application/json

Body:
{
  "farmerId": "uuid",
  "produceType": "wheat",
  "imageData": "base64_string_or_data_url",
  "location": { "lat": 30.7333, "lng": 76.7794 }
}
```

## Technical Stack

- **Image Processing**: Sharp (fast Node.js image library)
- **AI Model**: Hugging Face Vision Transformer (optional)
- **File Upload**: Multer (multipart/form-data handling)
- **Analysis**: Custom algorithms for color, brightness, and quality

## Limitations

1. **Crop Detection**: May not work for all crops or in poor lighting
2. **Quality Assessment**: Based on visual metrics only (no chemical analysis)
3. **Internet Required**: For Hugging Face API (falls back to local analysis)
4. **Image Quality**: Better photos = more accurate results

## Future Enhancements

- [ ] Train custom models for specific crops
- [ ] Add disease detection
- [ ] Implement ripeness detection
- [ ] Support video analysis
- [ ] Add batch processing
- [ ] Integrate with TensorFlow Lite for mobile

## Testing Tips

For best results:
- Use well-lit photos
- Capture produce from multiple angles
- Ensure produce fills most of the frame
- Avoid blurry or low-resolution images
- Test with different crop types

Enjoy the AI-powered grading! 🌾🤖
