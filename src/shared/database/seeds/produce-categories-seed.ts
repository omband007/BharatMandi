/**
 * Seed data for produce categories
 * Defines default categories with expiry periods for perishability-based listing expiration
 * Requirements: 6.5
 */

import { v4 as uuidv4 } from 'uuid';

export interface ProduceCategorySeed {
  id: string;
  name: string;
  expiry_period_hours: number;
  description: string;
}

/**
 * Default produce categories with expiry periods
 * Expiry period is in hours after harvest date
 */
export const produceCategoriesSeedData: ProduceCategorySeed[] = [
  {
    id: uuidv4(),
    name: 'Leafy Greens',
    expiry_period_hours: 24,
    description: 'Palak, methi, dhania, lettuce - highly perishable greens'
  },
  {
    id: uuidv4(),
    name: 'Fruits',
    expiry_period_hours: 48,
    description: 'Tomato, apple, mango, banana - moderately perishable fruits'
  },
  {
    id: uuidv4(),
    name: 'Root Vegetables',
    expiry_period_hours: 168, // 7 days
    description: 'Potato, onion, garlic, carrot - long-lasting root vegetables'
  },
  {
    id: uuidv4(),
    name: 'Grains',
    expiry_period_hours: 672, // 28 days
    description: 'Wheat, rice, corn, millet - dry grains with extended shelf life'
  }
];

/**
 * Get total count of seed data entries
 */
export function getProduceCategoriesSeedCount(): number {
  return produceCategoriesSeedData.length;
}

/**
 * Get category by name
 */
export function getCategoryByName(name: string): ProduceCategorySeed | undefined {
  return produceCategoriesSeedData.find(cat => cat.name === name);
}

/**
 * Get all category names
 */
export function getAllCategoryNames(): string[] {
  return produceCategoriesSeedData.map(cat => cat.name);
}
