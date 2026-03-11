#!/usr/bin/env python3
"""
Download crop disease test images from PlantVillage dataset
This script downloads a curated set of real crop disease images for testing
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    try:
        from datasets import load_dataset
        from PIL import Image
        return True
    except ImportError as e:
        print("❌ Missing required packages!")
        print("\nPlease install required packages:")
        print("  pip install datasets pillow")
        print("\nOr using the requirements file:")
        print("  pip install -r scripts/test-image-requirements.txt")
        return False

def download_plantvillage_images():
    """Download selected images from PlantVillage dataset"""
    from datasets import load_dataset
    from PIL import Image
    
    print("📥 Downloading PlantVillage dataset...")
    print("   (This may take a few minutes on first run)")
    
    try:
        # Load dataset
        dataset = load_dataset("manoela/plantvillage", split="train")
        
        # Create test images directory structure
        base_dir = Path("test-images")
        base_dir.mkdir(exist_ok=True)
        
        # Define which classes to download (Indian-relevant crops)
        target_classes = {
            # Tomato diseases (very common in India)
            "Tomato___Late_blight": "tomato/late-blight",
            "Tomato___Early_blight": "tomato/early-blight",
            "Tomato___Septoria_leaf_spot": "tomato/septoria-leaf-spot",
            "Tomato___Bacterial_spot": "tomato/bacterial-spot",
            "Tomato___healthy": "tomato/healthy",
            
            # Potato diseases (common in North India)
            "Potato___Late_blight": "potato/late-blight",
            "Potato___Early_blight": "potato/early-blight",
            "Potato___healthy": "potato/healthy",
            
            # Pepper (common in South India)
            "Pepper,_bell___Bacterial_spot": "pepper/bacterial-spot",
            "Pepper,_bell___healthy": "pepper/healthy",
            
            # Corn (maize - major crop)
            "Corn_(maize)___Common_rust_": "corn/common-rust",
            "Corn_(maize)___Northern_Leaf_Blight": "corn/northern-leaf-blight",
            "Corn_(maize)___healthy": "corn/healthy",
        }
        
        # Create directories
        for path in target_classes.values():
            (base_dir / path).mkdir(parents=True, exist_ok=True)
        
        # Download images (5 per class for testing)
        images_per_class = 5
        class_counts = {cls: 0 for cls in target_classes.keys()}
        
        print("\n📸 Downloading images...")
        total_downloaded = 0
        
        for idx, example in enumerate(dataset):
            # Get class name from caption
            caption = example.get('caption', '')
            
            # Parse caption to extract class name
            # Format is like "Tomato healthy" or "Tomato late blight"
            # We need to convert to "Tomato___healthy" or "Tomato___Late_blight"
            if not caption:
                continue
            
            # Map caption format to class name format
            caption_lower = caption.lower()
            class_name = None
            
            # Check each target class
            for target_class in target_classes.keys():
                # Convert class name to searchable format
                # "Tomato___Late_blight" -> "tomato late blight"
                search_term = target_class.replace('___', ' ').replace('_', ' ').replace(',', '').lower()
                
                if search_term in caption_lower:
                    class_name = target_class
                    break
            
            if class_name and class_counts[class_name] < images_per_class:
                # Get image and save
                image = example['image']
                save_path = base_dir / target_classes[class_name] / f"image_{class_counts[class_name] + 1}.jpg"
                
                # Convert to RGB if needed (some images might be RGBA)
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                image.save(save_path, 'JPEG', quality=95)
                
                class_counts[class_name] += 1
                total_downloaded += 1
                
                print(f"   ✓ {class_name}: {class_counts[class_name]}/{images_per_class}")
                
                # Check if we're done
                if all(count >= images_per_class for count in class_counts.values()):
                    break
        
        print(f"\n✅ Successfully downloaded {total_downloaded} test images!")
        print(f"   Location: {base_dir.absolute()}")
        
        # Create README
        create_readme(base_dir, class_counts)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error downloading images: {e}")
        import traceback
        traceback.print_exc()
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Ensure you have enough disk space (~50MB)")
        print("  3. Try running again (dataset will be cached)")
        return False

def create_readme(base_dir, class_counts):
    """Create README file in test-images directory"""
    readme_content = """# Crop Disease Test Images

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
curl -X POST http://localhost:3000/api/diagnosis \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "image=@test-images/tomato/late-blight/image_1.jpg" \\
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
"""
    
    readme_path = base_dir / "README.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"   📄 Created README: {readme_path}")

def main():
    """Main function"""
    print("=" * 60)
    print("  Crop Disease Test Image Downloader")
    print("=" * 60)
    print()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Download images
    success = download_plantvillage_images()
    
    if success:
        print("\n" + "=" * 60)
        print("  ✅ Download Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Check the test-images/ directory")
        print("  2. Start your server: npm run dev")
        print("  3. Test the diagnosis API with these images")
        print("\nExample test command:")
        print("  curl -X POST http://localhost:3000/api/diagnosis \\")
        print("    -H 'Authorization: Bearer YOUR_JWT' \\")
        print("    -F 'image=@test-images/tomato/late-blight/image_1.jpg'")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
