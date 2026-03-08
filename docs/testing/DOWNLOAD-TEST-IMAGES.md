# Download Test Images - Quick Start Guide

This guide explains how to download real crop disease images for testing the Crop Disease Diagnosis feature.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Internet connection (~50MB download)

## Quick Start

### Windows (PowerShell)

```powershell
# Run the download script
.\scripts\download-test-images.ps1
```

### Linux/Mac (Bash)

```bash
# Make script executable
chmod +x scripts/download-test-images.sh

# Run the download script
./scripts/download-test-images.sh
```

### Manual Python Execution

```bash
# Install dependencies
pip install -r scripts/test-image-requirements.txt

# Run the download script
python scripts/download-test-images.py
```

## What Gets Downloaded

The script downloads **65 real crop disease images** from the PlantVillage dataset:

### Tomato (25 images)
- Late Blight (5 images) - Common fungal disease
- Early Blight (5 images) - Alternaria fungus
- Septoria Leaf Spot (5 images) - Fungal disease
- Bacterial Spot (5 images) - Bacterial infection
- Healthy (5 images) - Control images

### Potato (15 images)
- Late Blight (5 images) - Same pathogen as tomato
- Early Blight (5 images) - Common in North India
- Healthy (5 images) - Control images

### Pepper/Bell Pepper (10 images)
- Bacterial Spot (5 images) - Common in South India
- Healthy (5 images) - Control images

### Corn/Maize (15 images)
- Common Rust (5 images) - Fungal disease
- Northern Leaf Blight (5 images) - Major corn disease
- Healthy (5 images) - Control images

## Directory Structure

After download, you'll have:

```
test-images/
├── README.md                    # Documentation
├── tomato/
│   ├── late-blight/
│   │   ├── image_1.jpg
│   │   ├── image_2.jpg
│   │   ├── image_3.jpg
│   │   ├── image_4.jpg
│   │   └── image_5.jpg
│   ├── early-blight/
│   ├── septoria-leaf-spot/
│   ├── bacterial-spot/
│   └── healthy/
├── potato/
│   ├── late-blight/
│   ├── early-blight/
│   └── healthy/
├── pepper/
│   ├── bacterial-spot/
│   └── healthy/
└── corn/
    ├── common-rust/
    ├── northern-leaf-blight/
    └── healthy/
```

## Testing with Downloaded Images

### 1. Start Your Server

```bash
npm run dev
```

### 2. Test Single Image

```bash
# Windows PowerShell
$token = "YOUR_JWT_TOKEN"
$image = "test-images/tomato/late-blight/image_1.jpg"

curl -X POST http://localhost:3000/api/diagnosis `
  -H "Authorization: Bearer $token" `
  -F "image=@$image" `
  -F "language=en"
```

```bash
# Linux/Mac
curl -X POST http://localhost:3000/api/diagnosis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-images/tomato/late-blight/image_1.jpg" \
  -F "language=en"
```

### 3. Test Multiple Images (Batch Test)

Create a simple test script:

```bash
# test-all-images.sh
for img in test-images/tomato/late-blight/*.jpg; do
  echo "Testing: $img"
  curl -X POST http://localhost:3000/api/diagnosis \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -F "image=@$img" \
    -F "language=en"
  echo ""
done
```

## Recommended Test Scenarios

### Scenario 1: High Confidence Detection
**Image**: `test-images/tomato/late-blight/image_1.jpg`  
**Expected**:
- Disease: Late Blight detected
- Confidence: >85%
- Remedies: Chemical, Organic, Preventive
- Expert Escalation: No

### Scenario 2: Healthy Crop
**Image**: `test-images/tomato/healthy/image_1.jpg`  
**Expected**:
- Disease: None
- Confidence: >90%
- Message: "No diseases detected"

### Scenario 3: Cache Testing
**Steps**:
1. Upload `test-images/tomato/late-blight/image_1.jpg`
2. Upload same image again
3. Compare response times

**Expected**:
- First request: ~2-3 seconds (Nova Pro analysis)
- Second request: <500ms (cache hit)

### Scenario 4: Different Diseases
**Images**: Test all disease types  
**Expected**: Different diagnoses and remedies for each disease

## Troubleshooting

### "ModuleNotFoundError: No module named 'datasets'"

```bash
pip install datasets pillow
```

### "Connection Error" or "Timeout"

- Check your internet connection
- Try again (dataset will be cached after first download)
- Use a VPN if you're behind a firewall

### "Permission Denied" (Linux/Mac)

```bash
chmod +x scripts/download-test-images.sh
```

### Script Hangs on "Downloading PlantVillage dataset"

This is normal on first run. The dataset is ~2GB but we only download what we need. Wait 2-5 minutes.

## Dataset Information

**Source**: PlantVillage Dataset  
**License**: CC0 (Public Domain)  
**Citation**: Hughes, D. P., & Salathe, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. arXiv preprint arXiv:1511.08060.

## Why These Crops?

All selected crops are commonly grown in India:

- **Tomato**: Major vegetable crop across all states
- **Potato**: Extensively grown in UP, Punjab, West Bengal, Bihar
- **Pepper**: Common in Karnataka, Andhra Pradesh, Tamil Nadu
- **Corn/Maize**: Major cereal crop across India

## Next Steps

After downloading images:

1. ✅ Test basic diagnosis flow
2. ✅ Test caching mechanism
3. ✅ Test expert escalation (use poor quality images)
4. ✅ Test Kisan Mitra integration
5. ✅ Test multilingual support (Hindi, Telugu, etc.)

## Need More Images?

If you need additional test images:

1. **Indian Rice Disease Dataset**: https://ieee-dataport.org/documents/indian-rice-disease-dataset-irdd
2. **Multi-Crop Disease Dataset**: https://data.mendeley.com/datasets/6243z8r6t6
3. **Take your own photos**: Use real crop images from local farms

## Support

If you encounter issues:
1. Check the error messages in the script output
2. Verify Python and pip versions
3. Ensure you have internet connectivity
4. Check available disk space (~50MB needed)

