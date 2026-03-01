import type { FarmingTip } from '../mongodb-models';

/**
 * Seed data for farming tips knowledge base
 * Covers top 20 crops with advice on planting, irrigation, pest control, and harvesting
 */
export const farmingTipsSeedData: Omit<FarmingTip, 'createdAt' | 'updatedAt'>[] = [
  // ============================================================================
  // WHEAT (गेहूं)
  // ============================================================================
  {
    crop: 'wheat',
    topic: 'planting',
    advice: 'Wheat should be sown in November-December when temperature is 20-25°C. Use certified seeds at 100-125 kg per hectare.',
    tips: [
      'Prepare field with 2-3 ploughings for fine tilth',
      'Apply farmyard manure 2-3 weeks before sowing',
      'Maintain row spacing of 20-23 cm',
      'Sow seeds at 5-6 cm depth',
      'Use seed treatment with fungicide before sowing'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Guidelines', 'Wheat Production Manual']
  },
  {
    crop: 'wheat',
    topic: 'irrigation',
    advice: 'Wheat requires 4-6 irrigations depending on soil type and climate. Critical stages are crown root initiation, tillering, flowering, and grain filling.',
    tips: [
      'First irrigation at 20-25 days after sowing (crown root stage)',
      'Second irrigation at tillering stage (40-45 days)',
      'Third irrigation at jointing stage (60-65 days)',
      'Fourth irrigation at flowering stage (80-85 days)',
      'Fifth irrigation at milk stage (100-105 days)',
      'Avoid waterlogging - ensure proper drainage'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Guidelines', 'Wheat Production Manual']
  },
  {
    crop: 'wheat',
    topic: 'pest-control',
    advice: 'Common wheat pests include aphids, termites, and stem borers. Monitor regularly and use integrated pest management.',
    tips: [
      'Monitor for aphids during flowering stage',
      'Use neem-based pesticides for organic control',
      'Apply chlorpyrifos for termite control if needed',
      'Remove and destroy infected plant parts',
      'Maintain field hygiene to prevent pest buildup',
      'Use yellow sticky traps for early detection'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'wheat',
    topic: 'harvesting',
    advice: 'Harvest wheat when grains are hard and moisture content is 20-25%. Typically ready 120-150 days after sowing.',
    tips: [
      'Harvest when grains turn golden yellow',
      'Check grain hardness by pressing between fingers',
      'Harvest in morning hours to reduce grain shattering',
      'Use combine harvester for large areas',
      'Dry grains to 12-14% moisture before storage',
      'Store in clean, dry, pest-free containers'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // RICE (धान)
  // ============================================================================
  {
    crop: 'rice',
    topic: 'planting',
    advice: 'Rice is grown in Kharif season. Transplant 25-30 day old seedlings with 2-3 seedlings per hill at 20x15 cm spacing.',
    tips: [
      'Prepare nursery beds 3-4 weeks before transplanting',
      'Puddle the main field thoroughly',
      'Transplant in rows for better management',
      'Use certified seeds at 20-25 kg per hectare',
      'Apply basal fertilizer before transplanting',
      'Maintain 2-3 cm water level during transplanting'
    ],
    season: 'Kharif (Monsoon)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Rice Production Guide']
  },
  {
    crop: 'rice',
    topic: 'irrigation',
    advice: 'Rice requires continuous standing water of 5-10 cm depth. Drain field 10 days before harvest.',
    tips: [
      'Maintain 5-10 cm water depth throughout growth',
      'Drain field during tillering for better root growth',
      'Refill after 2-3 days of draining',
      'Ensure proper water circulation',
      'Drain completely 10 days before harvest',
      'Use alternate wetting and drying (AWD) to save water'
    ],
    season: 'Kharif (Monsoon)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Rice Production Guide']
  },
  {
    crop: 'rice',
    topic: 'pest-control',
    advice: 'Major rice pests include stem borer, leaf folder, and brown plant hopper. Use IPM strategies for control.',
    tips: [
      'Install pheromone traps for stem borer monitoring',
      'Use light traps to attract and kill insects',
      'Apply neem oil for organic pest control',
      'Remove weeds that harbor pests',
      'Use resistant varieties when available',
      'Avoid excessive nitrogen fertilizer'
    ],
    season: 'Kharif (Monsoon)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'rice',
    topic: 'harvesting',
    advice: 'Harvest rice when 80% of grains turn golden yellow. Typically ready 120-140 days after transplanting.',
    tips: [
      'Harvest when grains are firm and golden',
      'Drain field 7-10 days before harvest',
      'Cut crop close to ground level',
      'Thresh within 2-3 days to prevent grain damage',
      'Dry grains to 14% moisture content',
      'Store in moisture-proof containers'
    ],
    season: 'Kharif (Monsoon)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // TOMATO (टमाटर)
  // ============================================================================
  {
    crop: 'tomato',
    topic: 'planting',
    advice: 'Tomato can be grown year-round with proper care. Transplant 4-5 week old seedlings at 60x45 cm spacing.',
    tips: [
      'Prepare raised beds for better drainage',
      'Apply well-decomposed farmyard manure',
      'Transplant in evening hours',
      'Water immediately after transplanting',
      'Provide support stakes for indeterminate varieties',
      'Mulch around plants to conserve moisture'
    ],
    season: 'All seasons',
    region: 'All India',
    language: 'en',
    references: ['ICAR Vegetable Production Guide']
  },
  {
    crop: 'tomato',
    topic: 'irrigation',
    advice: 'Tomato requires regular irrigation. Water stress during flowering and fruiting reduces yield.',
    tips: [
      'Water immediately after transplanting',
      'Irrigate every 3-4 days in summer',
      'Irrigate every 7-10 days in winter',
      'Use drip irrigation for water efficiency',
      'Avoid overhead irrigation to prevent diseases',
      'Reduce watering during fruit ripening'
    ],
    season: 'All seasons',
    region: 'All India',
    language: 'en',
    references: ['ICAR Vegetable Production Guide']
  },
  {
    crop: 'tomato',
    topic: 'pest-control',
    advice: 'Common tomato pests include fruit borer, whitefly, and aphids. Early detection is key.',
    tips: [
      'Install yellow sticky traps for whitefly',
      'Remove and destroy infected fruits',
      'Spray neem oil for organic control',
      'Use pheromone traps for fruit borer',
      'Maintain field sanitation',
      'Rotate crops to break pest cycles'
    ],
    season: 'All seasons',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'tomato',
    topic: 'harvesting',
    advice: 'Harvest tomatoes when they reach mature green to red ripe stage depending on market distance.',
    tips: [
      'Harvest at breaker stage for distant markets',
      'Harvest at red ripe stage for local markets',
      'Pick fruits with calyx attached',
      'Harvest in morning or evening hours',
      'Handle fruits carefully to avoid bruising',
      'Sort and grade before packing'
    ],
    season: 'All seasons',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // POTATO (आलू)
  // ============================================================================
  {
    crop: 'potato',
    topic: 'planting',
    advice: 'Plant potato tubers in October-November in plains and March-April in hills. Use certified seed tubers.',
    tips: [
      'Cut large tubers into 30-40g pieces with 2-3 eyes',
      'Treat cut pieces with fungicide',
      'Plant at 20 cm depth with 60x20 cm spacing',
      'Apply basal fertilizer in furrows',
      'Earth up after 25-30 days',
      'Use disease-free certified seed tubers'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Potato Production Guide']
  },
  {
    crop: 'potato',
    topic: 'irrigation',
    advice: 'Potato requires 5-6 irrigations. Critical stages are tuber initiation and bulking.',
    tips: [
      'First irrigation 10-15 days after planting',
      'Irrigate at 10-12 day intervals',
      'Critical irrigation at tuber initiation (30-40 days)',
      'Maintain soil moisture during bulking',
      'Stop irrigation 10 days before harvest',
      'Avoid waterlogging'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Potato Production Guide']
  },
  {
    crop: 'potato',
    topic: 'pest-control',
    advice: 'Major potato pests include late blight, aphids, and tuber moth. Preventive measures are essential.',
    tips: [
      'Use disease-free seed tubers',
      'Spray mancozeb for late blight prevention',
      'Monitor for aphids regularly',
      'Remove volunteer plants',
      'Practice crop rotation',
      'Store tubers in cool, dark place'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'potato',
    topic: 'harvesting',
    advice: 'Harvest potato when plants turn yellow and dry. Typically ready 90-120 days after planting.',
    tips: [
      'Stop irrigation 10 days before harvest',
      'Cut haulms 10 days before digging',
      'Dig carefully to avoid tuber damage',
      'Cure tubers in shade for 2-3 days',
      'Sort and grade before storage',
      'Store at 2-4°C with 90-95% humidity'
    ],
    season: 'Rabi (Winter)',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // ONION (प्याज)
  // ============================================================================
  {
    crop: 'onion',
    topic: 'planting',
    advice: 'Transplant 6-8 week old onion seedlings at 15x10 cm spacing. Onion can be grown in Kharif and Rabi seasons.',
    tips: [
      'Prepare raised beds for good drainage',
      'Transplant healthy seedlings of uniform size',
      'Plant at 2-3 cm depth',
      'Apply farmyard manure before planting',
      'Ensure proper spacing for bulb development',
      'Water immediately after transplanting'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Onion Production Guide']
  },
  {
    crop: 'onion',
    topic: 'irrigation',
    advice: 'Onion requires light and frequent irrigation. Avoid water stress during bulb formation.',
    tips: [
      'Irrigate every 5-7 days depending on soil',
      'Critical irrigation during bulb formation',
      'Use drip irrigation for better results',
      'Avoid waterlogging',
      'Stop irrigation 15 days before harvest',
      'Maintain consistent soil moisture'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Onion Production Guide']
  },
  {
    crop: 'onion',
    topic: 'pest-control',
    advice: 'Common onion pests include thrips, purple blotch, and stem fly. Regular monitoring is important.',
    tips: [
      'Monitor for thrips using blue sticky traps',
      'Spray neem oil for thrips control',
      'Remove and destroy infected plants',
      'Ensure good air circulation',
      'Avoid excessive nitrogen fertilizer',
      'Practice crop rotation'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'onion',
    topic: 'harvesting',
    advice: 'Harvest onion when tops fall over and turn yellow. Typically ready 120-150 days after transplanting.',
    tips: [
      'Harvest when 50% tops have fallen',
      'Stop irrigation 15 days before harvest',
      'Pull bulbs carefully',
      'Cure in shade for 7-10 days',
      'Remove dried tops after curing',
      'Store in well-ventilated area'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // MAIZE (मक्का)
  // ============================================================================
  {
    crop: 'maize',
    topic: 'planting',
    advice: 'Maize is grown in Kharif and Rabi seasons. Sow seeds at 60x20 cm spacing with 20-25 kg seed per hectare.',
    tips: [
      'Prepare field with 2-3 ploughings',
      'Sow seeds at 5 cm depth',
      'Use certified hybrid seeds',
      'Apply basal fertilizer at sowing',
      'Maintain proper row spacing',
      'Thin seedlings to one plant per hill'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Maize Production Guide']
  },
  {
    crop: 'maize',
    topic: 'irrigation',
    advice: 'Maize requires 4-5 irrigations. Critical stages are knee-high, tasseling, and grain filling.',
    tips: [
      'First irrigation at 20-25 days (knee-high stage)',
      'Second irrigation at tasseling (45-50 days)',
      'Third irrigation at silking (60-65 days)',
      'Fourth irrigation at grain filling (75-80 days)',
      'Avoid water stress during flowering',
      'Ensure good drainage'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Maize Production Guide']
  },
  {
    crop: 'maize',
    topic: 'pest-control',
    advice: 'Major maize pests include stem borer, fall armyworm, and shoot fly. Early detection is crucial.',
    tips: [
      'Monitor for fall armyworm regularly',
      'Apply neem-based pesticides',
      'Remove and destroy infected plants',
      'Use pheromone traps for monitoring',
      'Practice crop rotation',
      'Maintain field hygiene'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'maize',
    topic: 'harvesting',
    advice: 'Harvest maize when grains are hard and moisture content is 20-25%. Typically ready 90-110 days after sowing.',
    tips: [
      'Harvest when husks turn brown',
      'Check grain hardness by pressing',
      'Harvest cobs with husks',
      'Dry cobs in sun for 7-10 days',
      'Shell when moisture is 14-15%',
      'Store in dry, pest-free containers'
    ],
    season: 'Kharif & Rabi',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // COTTON (कपास)
  // ============================================================================
  {
    crop: 'cotton',
    topic: 'planting',
    advice: 'Cotton is a Kharif crop. Sow seeds in May-June at 90x60 cm spacing with 12-15 kg seed per hectare.',
    tips: [
      'Use certified Bt cotton seeds',
      'Treat seeds with fungicide',
      'Sow at 3-5 cm depth',
      'Maintain proper row spacing',
      'Thin to 1-2 plants per hill',
      'Apply basal fertilizer before sowing'
    ],
    season: 'Kharif (Monsoon)',
    region: 'Central & South India',
    language: 'en',
    references: ['ICAR Cotton Production Guide']
  },
  {
    crop: 'cotton',
    topic: 'irrigation',
    advice: 'Cotton requires 6-8 irrigations depending on rainfall. Critical stages are flowering and boll development.',
    tips: [
      'First irrigation at 30-40 days after sowing',
      'Irrigate at 15-20 day intervals',
      'Critical irrigation at flowering',
      'Maintain moisture during boll development',
      'Reduce irrigation at boll opening',
      'Avoid waterlogging'
    ],
    season: 'Kharif (Monsoon)',
    region: 'Central & South India',
    language: 'en',
    references: ['ICAR Cotton Production Guide']
  },
  {
    crop: 'cotton',
    topic: 'pest-control',
    advice: 'Major cotton pests include bollworm, whitefly, and aphids. Use integrated pest management.',
    tips: [
      'Monitor for pink bollworm using pheromone traps',
      'Install yellow sticky traps for whitefly',
      'Use Bt cotton varieties for bollworm resistance',
      'Spray neem oil for organic control',
      'Remove and destroy infected bolls',
      'Practice crop rotation'
    ],
    season: 'Kharif (Monsoon)',
    region: 'Central & South India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'cotton',
    topic: 'harvesting',
    advice: 'Cotton is harvested in multiple pickings when bolls open fully. First picking starts 120-150 days after sowing.',
    tips: [
      'Harvest when bolls are fully open',
      'Pick in 3-4 rounds at 15-day intervals',
      'Harvest in dry weather',
      'Avoid mixing different grades',
      'Dry cotton before storage',
      'Store in moisture-free place'
    ],
    season: 'Kharif (Monsoon)',
    region: 'Central & South India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },

  // ============================================================================
  // SUGARCANE (गन्ना)
  // ============================================================================
  {
    crop: 'sugarcane',
    topic: 'planting',
    advice: 'Plant sugarcane setts in February-March (spring) or October-November (autumn). Use 3-bud setts.',
    tips: [
      'Use disease-free healthy setts',
      'Treat setts with fungicide',
      'Plant at 90 cm row spacing',
      'Place setts end-to-end in furrows',
      'Cover with 5-7 cm soil',
      'Apply farmyard manure in furrows'
    ],
    season: 'Spring & Autumn',
    region: 'All India',
    language: 'en',
    references: ['ICAR Sugarcane Production Guide']
  },
  {
    crop: 'sugarcane',
    topic: 'irrigation',
    advice: 'Sugarcane requires 8-12 irrigations. It is a water-intensive crop requiring regular moisture.',
    tips: [
      'First irrigation immediately after planting',
      'Irrigate at 7-10 day intervals in summer',
      'Irrigate at 12-15 day intervals in winter',
      'Critical irrigation during tillering',
      'Maintain moisture during grand growth phase',
      'Stop irrigation 3-4 weeks before harvest'
    ],
    season: 'Spring & Autumn',
    region: 'All India',
    language: 'en',
    references: ['ICAR Sugarcane Production Guide']
  },
  {
    crop: 'sugarcane',
    topic: 'pest-control',
    advice: 'Major sugarcane pests include early shoot borer, top borer, and whitefly. Regular monitoring is essential.',
    tips: [
      'Remove and destroy infected shoots',
      'Use pheromone traps for borer monitoring',
      'Apply neem cake in soil',
      'Maintain field sanitation',
      'Use resistant varieties',
      'Practice crop rotation with legumes'
    ],
    season: 'Spring & Autumn',
    region: 'All India',
    language: 'en',
    references: ['ICAR Pest Management Guide']
  },
  {
    crop: 'sugarcane',
    topic: 'harvesting',
    advice: 'Harvest sugarcane when it reaches physiological maturity at 10-12 months. Check brix level before harvest.',
    tips: [
      'Harvest when brix reaches 18-20%',
      'Cut cane close to ground level',
      'Remove top leaves before cutting',
      'Transport to mill within 24 hours',
      'Avoid harvesting immature cane',
      'Harvest in dry weather'
    ],
    season: 'Spring & Autumn',
    region: 'All India',
    language: 'en',
    references: ['ICAR Harvesting Guidelines']
  },
];

/**
 * Get total count of seed data entries
 */
export function getFarmingTipsSeedCount(): number {
  return farmingTipsSeedData.length;
}

/**
 * Get seed data by crop
 */
export function getFarmingTipsByCrop(crop: string): Omit<FarmingTip, 'createdAt' | 'updatedAt'>[] {
  return farmingTipsSeedData.filter(tip => tip.crop === crop);
}

/**
 * Get all unique crops in seed data
 */
export function getUniqueCrops(): string[] {
  return [...new Set(farmingTipsSeedData.map(tip => tip.crop))];
}
