/**
 * CategoryManager Service
 * Manages produce categories for perishability-based listing expiration
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

export interface ProduceCategory {
  id: string;
  name: string;
  expiry_period_hours: number;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryInput {
  name: string;
  expiry_period_hours: number;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  expiry_period_hours?: number;
  description?: string;
}

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class CategoryManager {
  /**
   * Create a new produce category
   * Requirements: 6.1, 6.2, 6.6
   * 
   * @param input - Category creation data
   * @returns Created category
   * @throws Error if name already exists or expiry period is invalid
   */
  async createCategory(input: CreateCategoryInput): Promise<ProduceCategory> {
    // Validate expiry period range (1-8760 hours = 1 hour to 1 year)
    if (input.expiry_period_hours < 1 || input.expiry_period_hours > 8760) {
      throw new Error('Expiry period must be between 1 and 8760 hours (1 hour to 1 year)');
    }

    // Check if category name already exists
    const existing = await this.getCategoryByName(input.name);
    if (existing) {
      throw new Error(`Category with name "${input.name}" already exists`);
    }

    const category: ProduceCategory = {
      id: uuidv4(),
      name: input.name,
      expiry_period_hours: input.expiry_period_hours,
      description: input.description || '',
      created_at: new Date(),
      updated_at: new Date()
    };

    const dbManager = getDbManager();
    await dbManager.run(
      `INSERT INTO produce_categories (id, name, expiry_period_hours, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.expiry_period_hours,
        category.description,
        category.created_at.toISOString(),
        category.updated_at.toISOString()
      ]
    );

    return category;
  }

  /**
   * Update an existing produce category
   * Requirements: 6.3
   * 
   * @param id - Category ID
   * @param updates - Fields to update
   * @returns Updated category
   * @throws Error if category not found or validation fails
   */
  async updateCategory(id: string, updates: UpdateCategoryInput): Promise<ProduceCategory> {
    // Validate expiry period if provided
    if (updates.expiry_period_hours !== undefined) {
      if (updates.expiry_period_hours < 1 || updates.expiry_period_hours > 8760) {
        throw new Error('Expiry period must be between 1 and 8760 hours (1 hour to 1 year)');
      }
    }

    // Check if category exists
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Category with ID "${id}" not found`);
    }

    // Check if new name conflicts with another category
    if (updates.name && updates.name !== existing.name) {
      const nameConflict = await this.getCategoryByName(updates.name);
      if (nameConflict) {
        throw new Error(`Category with name "${updates.name}" already exists`);
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.expiry_period_hours !== undefined) {
      updateFields.push('expiry_period_hours = ?');
      updateValues.push(updates.expiry_period_hours);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updates.description);
    }

    // Always update updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());

    // Add ID to values for WHERE clause
    updateValues.push(id);

    const dbManager = getDbManager();
    await dbManager.run(
      `UPDATE produce_categories SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Return updated category
    const updated = await this.getCategoryById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated category');
    }

    return updated;
  }

  /**
   * Delete a produce category
   * Requirements: 6.4
   * 
   * @param id - Category ID
   * @throws Error if category has existing listings
   */
  async deleteCategory(id: string): Promise<void> {
    // Check if category exists
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Category with ID "${id}" not found`);
    }

    // Check if category has existing listings
    const dbManager = getDbManager();
    const listingsCount = await dbManager.get(
      'SELECT COUNT(*) as count FROM listings WHERE produce_category_id = ?',
      [id]
    );

    if (listingsCount && listingsCount.count > 0) {
      throw new Error(
        `Cannot delete category "${existing.name}" because it has ${listingsCount.count} existing listing(s)`
      );
    }

    // Delete category
    await dbManager.run('DELETE FROM produce_categories WHERE id = ?', [id]);
  }

  /**
   * Get all produce categories
   * Requirements: 6.1
   * 
   * @returns Array of all categories
   */
  async getCategories(): Promise<ProduceCategory[]> {
    const dbManager = getDbManager();
    const rows = await dbManager.all('SELECT * FROM produce_categories ORDER BY name');

    return rows.map(row => this.mapRowToCategory(row));
  }

  /**
   * Get a category by ID
   * Requirements: 6.1
   * 
   * @param id - Category ID
   * @returns Category or undefined if not found
   */
  async getCategoryById(id: string): Promise<ProduceCategory | undefined> {
    const dbManager = getDbManager();
    const row = await dbManager.get('SELECT * FROM produce_categories WHERE id = ?', [id]);

    if (!row) {
      return undefined;
    }

    return this.mapRowToCategory(row);
  }

  /**
   * Get a category by name
   * 
   * @param name - Category name
   * @returns Category or undefined if not found
   */
  async getCategoryByName(name: string): Promise<ProduceCategory | undefined> {
    const dbManager = getDbManager();
    const row = await dbManager.get('SELECT * FROM produce_categories WHERE name = ?', [name]);

    if (!row) {
      return undefined;
    }

    return this.mapRowToCategory(row);
  }

  /**
   * Map database row to ProduceCategory object
   * Handles both PostgreSQL and SQLite date formats
   */
  private mapRowToCategory(row: any): ProduceCategory {
    return {
      id: row.id,
      name: row.name,
      expiry_period_hours: row.expiry_period_hours,
      description: row.description || '',
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// Export singleton instance
export const categoryManager = new CategoryManager();
