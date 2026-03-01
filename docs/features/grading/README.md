# AI-Powered Produce Grading (Fasal-Parakh)

AI-powered quality assessment system for agricultural produce using computer vision and image analysis.

## Features

- Real-time image analysis of produce
- Automated crop type detection using Hugging Face Vision Transformer
- Quality grading (A/B/C) based on visual characteristics
- Color uniformity analysis
- Brightness and defect detection
- Digital quality certificates
- GPS-tagged grading results

## Documentation

- [AI Grading Guide](AI-GRADING-GUIDE.md) - Complete guide to the AI grading system

## How It Works

1. Farmer uploads photo of produce
2. AI analyzes color, size, brightness, and uniformity
3. System detects crop type (or uses manual input)
4. Quality grade assigned (A/B/C) with confidence score
5. Digital certificate generated with image hash

## Grading Criteria

- **Grade A**: High quality (≥80% confidence) - Uniform color, good brightness, no defects
- **Grade B**: Medium quality (60-80% confidence) - Moderate uniformity, minor defects
- **Grade C**: Lower quality (<60% confidence) - Non-uniform, significant defects

## Technical Stack

- Sharp (Node.js image processing)
- Hugging Face Vision Transformer (crop detection)
- Multer (file upload handling)
- Custom algorithms for quality metrics

## Related Specs

See `.kiro/specs/features/grading/` for requirements, design, and tasks.
