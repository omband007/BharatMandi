# Crop Disease Test Images - Real Indian Agricultural Data

This document provides sources for real crop disease images from India that can be used for testing the Crop Disease Diagnosis feature.

## Indian-Specific Datasets

### 1. Indian Rice Disease Dataset (IRDD)
**Source**: IEEE DataPort  
**URL**: https://ieee-dataport.org/documents/indian-rice-disease-dataset-irdd  
**Description**: Rice leaf images from West Bengal, India
- Contains: Brown Spot disease and Healthy rice leaves
- Real field conditions with various lighting
- Some images include dew drops (realistic conditions)
- **Crops**: Rice
- **Diseases**: Brown Spot, Healthy

### 2. Rice Leaf Disease and Pest Dataset
**Source**: Mendeley Data  
**URL**: https://data.mendeley.com/datasets/vwv3nry3wr  
**Description**: Comprehensive rice disease dataset from Indian fields
- 2,769 original images from various field conditions
- Expanded to 19,128 images through augmentation
- **Crops**: Rice
- **Use Case**: Machine learning training, precision agriculture

### 3. Multi-Crop Disease Dataset
**Source**: Mendeley Data  
**URL**: https://data.mendeley.com/datasets/6243z8r6t6  
**Description**: Over 23,000 images from real agricultural settings
- Bounding box annotations
- Multiple crops with healthy and disease categories
- 30+ disease classes
- **Diseases**: Sigatoka, Leaf Curl, Anthracnose, Rust, Downy Mildew, Black Rot, etc.

## PlantVillage Dataset (Includes Indian Crops)

### 4. PlantVillage Open Access Repository
**Source**: Penn State University & EPFL  
**URL**: https://arxiv.org/abs/1511.08060  
**Hugging Face**: https://huggingface.co/datasets/manoela/plantvillage  
**Description**: 50,000+ expertly curated images
- 14 crop species
- 17 diseases (bacterial, fungal, viral, mite-related)
- 38 classes total
- **Crops**: Tomato, Potato, Apple, Grape, Corn, and more
- **Diseases**: Late Blight, Early Blight, Septoria Leaf Spot, Bacterial Spot, etc.

**Indian-Relevant Crops in PlantVillage**:
- Tomato (multiple diseases)
- Potato (Late Blight, Early Blight)
- Corn/Maize
- Grape
- Bell Pepper

## Recommended Test Images for Your System

### Priority 1: Common Indian Crop Diseases

1. **Rice Brown Spot** (from IRDD dataset)
   - Very common in West Bengal and other rice-growing regions
   - Good for testing regional customization

2. **Tomato Late Blight** (from PlantVillage)
   - Common in Indian tomato cultivation
   - Tests high-severity disease detection

3. **Tomato Early Blight** (from PlantVillage)
   - Common fungal disease in India
   - Tests confidence scoring with clear symptoms

4. **Rice Blast** (from Rice Leaf Disease dataset)
   - Major rice disease in India
   - Tests disease identification accuracy

### Priority 2: Testing Different Scenarios

5. **Healthy Crop Images**
   - Tests false positive prevention
   - Validates "no disease detected" flow

6. **Multiple Disease Images**
   - Tests confidence reduction for multiple diseases
   - Validates expert escalation trigger

7. **Poor Quality Images**
   - Tests image quality assessment
   - Validates blur detection and lighting checks

## How to Download and Use

### Option 1: PlantVillage via Hugging Face (Easiest)
```bash
# Install huggingface datasets library
pip install datasets

# Download in Python
from datasets import load_dataset
dataset = load_dataset("manoela/plantvillage")

# Access images
for example in dataset['train']:
    image = example['image']
    label = example['label']
    # Save or use for testing
```

### Option 2: Direct Download from IEEE DataPort
1. Visit: https://ieee-dataport.org/documents/indian-rice-disease-dataset-irdd
2. Create free IEEE account if needed
3. Download dataset
4. Extract images for testing

### Option 3: Mendeley Data
1. Visit the Mendeley dataset URLs above
2. Download datasets (may require free Mendeley account)
3. Extract and organize images

## Testing Workflow

### Step 1: Organize Test Images
```
test-images/
├── rice/
│   ├── brown-spot/
│   ├── blast/
│   └── healthy/
├── tomato/
│   ├── late-blight/
│   ├── early-blight/
│   ├── septoria/
│   └── healthy/
└── potato/
    ├── late-blight/
    ├── early-blight/
    └── healthy/
```

### Step 2: Test Scenarios

1. **Basic Diagnosis Test**
   - Upload a clear tomato late blight image
   - Verify: Disease detected, remedies generated, confidence >80%

2. **Cache Test**
   - Upload same image twice
   - Verify: Second request is faster (cache hit)

3. **Expert Escalation Test**
   - Upload poor quality or ambiguous disease image
   - Verify: Confidence <80%, expert review request created

4. **Regional Customization Test**
   - Upload rice brown spot image
   - Set location to West Bengal
   - Verify: Regional remedies and seasonal guidance

5. **Kisan Mitra Integration Test**
   - Complete diagnosis
   - Verify: Context shared with Kisan Mitra
   - Ask follow-up question in chat

## Sample Test Cases

### Test Case 1: Tomato Late Blight (High Confidence)
- **Image**: Tomato leaf with water-soaked lesions
- **Expected**: 
  - Crop: Tomato
  - Disease: Late Blight (Phytophthora infestans)
  - Confidence: >85%
  - Remedies: Chemical (Mancozeb, Copper oxychloride), Organic, Preventive
  - Expert Escalation: No

### Test Case 2: Rice Brown Spot (Medium Confidence)
- **Image**: Rice leaf with brown spots
- **Expected**:
  - Crop: Rice
  - Disease: Brown Spot (Bipolaris oryzae)
  - Confidence: 70-85%
  - Remedies: Region-specific (West Bengal)
  - Expert Escalation: Possible if <80%

### Test Case 3: Healthy Crop (No Disease)
- **Image**: Healthy tomato/rice leaf
- **Expected**:
  - Crop: Detected
  - Disease: None
  - Confidence: >90%
  - Message: "No diseases detected"

## Notes

- All datasets mentioned are from real agricultural settings
- Images include natural variations (lighting, dew, field conditions)
- PlantVillage dataset is widely used in agricultural AI research
- Indian-specific datasets (IRDD, Rice Leaf) are ideal for regional testing
- Always test with multiple images per disease for robustness

## Attribution

When using these datasets, please cite:
- **PlantVillage**: Hughes, D. P., & Salathe, M. (2015). An open access repository of images on plant health to enable the development of mobile disease diagnostics. arXiv preprint arXiv:1511.08060.
- **IRDD**: Indian Rice Disease Dataset, IEEE DataPort
- **Mendeley Datasets**: As specified in each dataset's citation requirements

