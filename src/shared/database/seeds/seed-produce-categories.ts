/**
 * Seeding script for produce categories
 * Inserts default produce categories into both PostgreSQL and SQLite databases
 * Requirements: 6.5
 */

import { DatabaseManager } from '../db-abstraction';
import { produceCategoriesSeedData } from './produce-categories-seed';

/**
 * Seed produce categories into the database
 * @param db - Database manager instance
 */
export async function seedProduceCategories(db: DatabaseManager): Promise<void> {
  console.log('Seeding produce categories...');

  try {
    for (const category of produceCategoriesSeedData) {
      // Check if category already exists
      const existing = await db.get(
        'SELECT id FROM produce_categories WHERE name = ?',
        [category.name]
      );

      if (existing) {
        console.log(`Category "${category.name}" already exists, skipping...`);
        continue;
      }

      // Insert category
      await db.run(
        `INSERT INTO produce_categories (id, name, expiry_period_hours, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [category.id, category.name, category.expiry_period_hours, category.description]
      );

      console.log(`✓ Inserted category: ${category.name} (${category.expiry_period_hours}h expiry)`);
    }

    console.log(`✓ Successfully seeded ${produceCategoriesSeedData.length} produce categories`);
  } catch (error) {
    console.error('Error seeding produce categories:', error);
    throw error;
  }
}

/**
 * Main function to run seeding
 */
export async function runProduceCategoriesSeeding(): Promise<void> {
  const db = new DatabaseManager();
  
  try {
    await db.start();
    await seedProduceCategories(db);
    console.log('Produce categories seeding completed successfully');
  } catch (error) {
    console.error('Failed to seed produce categories:', error);
    process.exit(1);
  } finally {
    db.stop();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  runProduceCategoriesSeeding();
}
