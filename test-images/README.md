# Crop Disease Test Images

This directory contains real crop disease images downloaded from the PlantVillage dataset for testing the Crop Disease Diagnosis feature.

## Dataset Information

**Source**: PlantVillage Dataset  
**Citation**: Hughes, D. P., & Salathe, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. arXiv preprint arXiv:1511.08060.

## Directory Structure

```
test-images/
├── tomato/
│   ├── late-blight/          # Phytophthora infestans (5 images)
│   ├── early-blight/         # Alternaria solani (5 images)
│   ├── septoria-leaf-spot/   # Septoria lycopersici (5 images)
│   ├── bacterial-spot/       # Xanthomonas spp. (5 images)
│   └── healthy/              # Healthy tomato leaves (5 images)
├── potato/
│   ├── late-blight/          # Phytophthora infestans (5 images)
│   ├── early-blight/         # Alternaria solani (5 images)
│   └── healthy/              # Healthy potato leaves (5 images)
├── pepper/
│   ├── bacterial-spot/       # Xanthomonas spp. (5 images)
│   └── healthy/              # Healthy pepper leaves (5 images)
└── corn/
    ├── common-rust/          # Puccinia sorghi (5 images)
    ├── northern-leaf-blight/ # Exserohilum turcicum (5 images)
    └── healthy/              # Healthy corn leaves (5 images)
```

## Usage

### Test Individual Images

Use these images to test the diagnosis API:

```bash
# Example: Test tomato late blight
curl -X POST http://localhost:3000/api/diagnosis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-images/tomato/late-blight/image_1.jpg" \
  -F "language=en"
```

### Test Scenarios

1. **High Confidence Disease Detection**
   - Use: `tomato/late-blight/image_1.jpg`
   - Expected: Confidence >85%, clear disease identification

2. **Healthy Crop Detection**
   - Use: `tomato/healthy/image_1.jpg`
   - Expected: No disease detected, confidence >90%

3. **Cache Testing**
   - Upload same image twice
   - Expected: Second request faster (cache hit)

4. **Multiple Diseases**
   - Test with various disease images
   - Expected: Different remedies for different diseases

## Indian Crop Relevance

All crops in this dataset are commonly grown in India:

- **Tomato**: Major vegetable crop across India
- **Potato**: Extensively grown in North India (UP, Punjab, West Bengal)
- **Pepper**: Common in South India (Karnataka, Andhra Pradesh)
- **Corn/Maize**: Major cereal crop across India

## Notes

- All images are from real agricultural settings
- Images include natural variations in lighting and conditions
- Suitable for testing AI-based disease detection systems
- Images are in JPEG format, RGB color space

## License

PlantVillage dataset is released under CC0 (Public Domain) license.
