# Crop Detection

AI-powered crop identification from images using computer vision.

## Features

- Automatic crop type detection from photos
- Hugging Face Vision Transformer model
- Support for common Indian crops
- Confidence scoring
- Fallback to manual input

## Documentation

- [Crop Detection Update](CROP-DETECTION-UPDATE.md) - Feature updates and improvements

## Supported Crops

- Wheat (गेहूं)
- Rice (चावल)
- Tomato (टमाटर)
- Potato (आलू)
- Onion (प्याज)
- Corn (मक्का)
- And more...

## How It Works

1. **Image Upload**: User uploads photo of crop
2. **Preprocessing**: Image resized and optimized
3. **AI Analysis**: Vision Transformer identifies crop
4. **Confidence Score**: Returns crop type with confidence percentage
5. **Fallback**: Manual selection if confidence is low

## Technical Stack

- Hugging Face Vision Transformer
- Sharp (image processing)
- Node.js backend integration

## Integration

Crop detection is integrated with:
- [Grading](../grading/) - Automatic crop type for quality grading
- [Marketplace](../marketplace/) - Crop type for listings

## Related Documentation

- [Grading](../grading/) - Uses crop detection for grading
- [Architecture](../../architecture/) - AI/ML architecture

## Related Specs

See `.kiro/specs/features/grading/` for related specifications.

---

**For**: Backend Developers, ML Engineers  
**Purpose**: Crop identification and detection
