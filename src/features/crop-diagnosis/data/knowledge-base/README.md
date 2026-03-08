# Crop Disease Diagnosis Knowledge Base

## Overview

This knowledge base contains comprehensive disease-remedy mappings for common crop diseases affecting Indian agriculture. The data is organized by disease type and includes chemical remedies, organic alternatives, and preventive measures tailored for Indian farmers.

## Structure

The knowledge base is organized into 5 JSON files based on disease types:

### 1. `fungal.json` - Fungal Diseases (5 diseases)
- Late Blight (Phytophthora infestans)
- Powdery Mildew (Erysiphe cichoracearum)
- Rust (Puccinia spp.)
- Leaf Spot (Alternaria spp., Cercospora spp.)
- Anthracnose (Colletotrichum spp.)

### 2. `bacterial.json` - Bacterial Diseases (3 diseases)
- Bacterial Wilt (Ralstonia solanacearum)
- Bacterial Blight (Xanthomonas spp.)
- Soft Rot (Erwinia carotovora)

### 3. `viral.json` - Viral Diseases (4 diseases)
- Tomato Mosaic Virus (ToMV)
- Leaf Curl Virus (ToLCV)
- Yellow Vein Mosaic Virus (BYVMV)
- Rice Tungro Virus (RTBV)

### 4. `pests.json` - Pest Infestations (5 pests)
- Aphids (Aphis gossypii, Myzus persicae)
- Whiteflies (Bemisia tabaci)
- Bollworms (Helicoverpa armigera)
- Stem Borers (Scirpophaga incertulas, Chilo partellus)
- Leaf Miners (Liriomyza trifolii)

### 5. `nutrient-deficiency.json` - Nutrient Deficiencies (5 deficiencies)
- Nitrogen Deficiency
- Phosphorus Deficiency
- Potassium Deficiency
- Iron Deficiency (Iron chlorosis)
- Magnesium Deficiency

**Total: 22 common crop diseases/issues**

## Affected Crops Coverage

The knowledge base covers the following major Indian crops:
- **Cereals**: Rice, Wheat, Maize
- **Cash Crops**: Cotton, Sugarcane
- **Vegetables**: Tomato, Potato, Onion, Chili, Brinjal

## Data Schema

Each disease entry follows this structure:

```json
{
  "name": "Disease common name",
  "scientificName": "Scientific name",
  "affectedCrops": ["crop1", "crop2"],
  "chemicalRemedies": [
    {
      "genericName": "Chemical generic name",
      "brandNames": ["Brand1", "Brand2"],
      "dosage": "Dosage per liter or per acre",
      "applicationMethod": "spray | soil drench | seed treatment",
      "frequency": "Application frequency",
      "preHarvestInterval": 7,
      "safetyPrecautions": ["Precaution 1", "Precaution 2"],
      "costEstimate": "₹200-300 per acre"
    }
  ],
  "organicRemedies": [
    {
      "name": "Remedy name",
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "preparation": ["Step 1", "Step 2"],
      "applicationMethod": "Application method",
      "frequency": "Application frequency",
      "effectiveness": "Effectiveness description",
      "commercialProducts": ["Product 1", "Product 2"]
    }
  ],
  "preventiveMeasures": [
    {
      "category": "crop_rotation | irrigation | spacing | soil_health | timing",
      "description": "Measure description",
      "timing": "When to implement",
      "frequency": "How often"
    }
  ]
}
```

## Field Descriptions

### Disease Information
- **name**: Common name used by farmers
- **scientificName**: Scientific/Latin name for accuracy
- **affectedCrops**: List of crops susceptible to this disease

### Chemical Remedies
- **genericName**: Active ingredient name
- **brandNames**: Popular Indian brand names (e.g., Dithane M-45, Confidor)
- **dosage**: Specific dosage per liter of water or per acre
- **applicationMethod**: How to apply (foliar spray, soil drench, etc.)
- **frequency**: How often to apply (e.g., "Every 7-10 days")
- **preHarvestInterval**: Days before harvest when application must stop
- **safetyPrecautions**: Safety measures for farmers
- **costEstimate**: Estimated cost in Indian Rupees (₹) per acre

### Organic Remedies
- **name**: Name of organic remedy
- **ingredients**: List of ingredients with quantities
- **preparation**: Step-by-step preparation instructions
- **applicationMethod**: How to apply
- **frequency**: Application frequency
- **effectiveness**: Comparison to chemical remedies (percentage or description)
- **commercialProducts**: Available commercial organic products (optional)

### Preventive Measures
- **category**: Type of preventive measure
  - `crop_rotation`: Crop rotation practices
  - `irrigation`: Water management
  - `spacing`: Plant spacing recommendations
  - `soil_health`: Soil management practices
  - `timing`: Time-based interventions
- **description**: Detailed description of the measure
- **timing**: When to implement (e.g., "At planting", "Throughout season")
- **frequency**: How often (e.g., "Weekly", "One-time", "Seasonal")

## Usage Guidelines

### For Remedy Generator Service

1. **Loading Data**: Load all JSON files at service initialization
2. **Disease Matching**: Match diagnosed disease name to knowledge base entries
3. **Crop-Specific Filtering**: Filter remedies based on affected crops
4. **Regional Customization**: Adjust brand names and products based on farmer location
5. **Language Translation**: Translate all text fields to farmer's preferred language
6. **Cost Localization**: Ensure cost estimates are current and region-appropriate

### Example Usage

```typescript
import fungalDiseases from './fungal.json';
import bacterialDiseases from './bacterial.json';
import viralDiseases from './viral.json';
import pests from './pests.json';
import nutrientDeficiencies from './nutrient-deficiency.json';

// Combine all disease data
const knowledgeBase = {
  fungal: fungalDiseases.diseases,
  bacterial: bacterialDiseases.diseases,
  viral: viralDiseases.diseases,
  pests: pests.diseases,
  nutrient_deficiency: nutrientDeficiencies.diseases
};

// Find remedy for a specific disease
function getRemedies(diseaseName: string, diseaseType: string) {
  const diseases = knowledgeBase[diseaseType];
  return diseases.find(d => d.name === diseaseName);
}

// Filter by crop
function getRemediesForCrop(diseaseName: string, diseaseType: string, cropType: string) {
  const disease = getRemedies(diseaseName, diseaseType);
  if (disease && disease.affectedCrops.includes(cropType)) {
    return disease;
  }
  return null;
}
```

## Data Quality Standards

### Chemical Remedies
- All brand names are commonly available in Indian agricultural markets
- Dosages follow Indian Council of Agricultural Research (ICAR) recommendations
- Pre-harvest intervals comply with Indian food safety standards
- Cost estimates based on 2024 market prices

### Organic Remedies
- Ingredients are locally available in rural India
- Preparation methods are practical for small-scale farmers
- Effectiveness percentages are based on field trials and research
- Commercial products listed are available through Indian agricultural stores

### Preventive Measures
- Practices are suitable for Indian climate and farming conditions
- Recommendations consider resource constraints of small farmers
- Timing aligned with typical Indian cropping seasons
- Frequency is practical and economically viable

## Maintenance and Updates

### Adding New Diseases
1. Identify disease type (fungal, bacterial, viral, pest, nutrient_deficiency)
2. Follow the JSON schema structure
3. Include at least 2 chemical remedies and 1 organic remedy
4. Add minimum 3 preventive measures
5. Verify all brand names are available in India
6. Update this README with the new disease count

### Updating Existing Data
- Review cost estimates annually
- Update brand names if products are discontinued
- Add new organic remedies as research becomes available
- Revise effectiveness percentages based on field feedback

### Data Sources
- Indian Council of Agricultural Research (ICAR) publications
- State Agricultural Universities research papers
- Central Insecticides Board and Registration Committee (CIBRC) guidelines
- Farmer feedback and field trials
- Agricultural extension service recommendations

## Regional Customization

The Remedy Generator service should customize recommendations based on:

### State-Specific Factors
- **Product Availability**: Some brands may not be available in all states
- **Crop Varieties**: Different states grow different varieties with varying susceptibility
- **Climate**: Seasonal patterns affect disease prevalence and remedy effectiveness
- **Regulations**: Some chemicals may have state-specific restrictions

### Language Support
All text content should be translated to:
- Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia

### Cost Adjustments
- Prices may vary by region (±20%)
- Consider local market conditions
- Factor in transportation costs for remote areas

## Compliance and Safety

### Chemical Safety
- All listed chemicals are approved by Central Insecticides Board (CIB)
- Pre-harvest intervals must be strictly followed
- Safety precautions are mandatory, not optional
- Farmers should be advised to use protective equipment

### Organic Certification
- Organic remedies listed are acceptable for organic farming certification
- Commercial organic products should have organic certification
- Preparation methods maintain organic integrity

### Environmental Considerations
- Recommendations consider impact on beneficial insects
- Water contamination warnings included where applicable
- Integrated Pest Management (IPM) principles followed

## Future Enhancements

### Planned Additions
1. More crop-specific diseases (pulses, oilseeds, fruits)
2. Regional disease variants
3. Resistance management strategies
4. Biological control agents
5. Weather-based disease forecasting integration
6. Soil type-specific recommendations

### Data Enrichment
- Add images of disease symptoms
- Include video links for remedy preparation
- Add success rate data from field trials
- Include farmer testimonials
- Link to government subsidy schemes for inputs

## Support and Feedback

For questions, corrections, or suggestions regarding the knowledge base:
- Review disease identification accuracy through farmer feedback
- Update remedy effectiveness based on field results
- Add new diseases based on emerging threats
- Revise cost estimates based on market changes

## Version History

- **v1.0** (2024): Initial knowledge base with 22 diseases covering 10 major Indian crops
  - 5 fungal diseases
  - 3 bacterial diseases
  - 4 viral diseases
  - 5 pest infestations
  - 5 nutrient deficiencies
  - Chemical and organic remedies for all
  - Preventive measures for all
  - Indian brand names and cost estimates

## License and Attribution

This knowledge base is compiled from public agricultural research and extension materials. All recommendations follow Indian agricultural standards and guidelines.

**Sources:**
- Indian Council of Agricultural Research (ICAR)
- State Agricultural Universities
- Central Insecticides Board and Registration Committee (CIBRC)
- Directorate of Plant Protection, Quarantine & Storage
- Agricultural extension service publications

---

**Last Updated**: 2024
**Total Diseases**: 22
**Total Crops Covered**: 10
**Languages Supported**: 11 Indian languages
