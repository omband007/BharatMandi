/**
 * Mock for UserProfileModel
 * Used in unit tests to avoid real MongoDB connections
 */

export const UserProfileModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};

export const PromptTrackingModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

export const PointsTransactionModel = {
  create: jest.fn(),
  find: jest.fn(),
};
