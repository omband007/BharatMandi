/**
 * Profile Mongoose Models
 * 
 * Mongoose model instances for profile management collections.
 */

import mongoose from 'mongoose';
import {
  UserProfileSchema,
  PromptTrackingSchema,
  PointsTransactionSchema,
  ReferralSchema
} from './profile.schema';

// Create models
export const UserProfileModel = mongoose.model('UserProfile', UserProfileSchema);
export const PromptTrackingModel = mongoose.model('PromptTracking', PromptTrackingSchema);
export const PointsTransactionModel = mongoose.model('PointsTransaction', PointsTransactionSchema);
export const ReferralModel = mongoose.model('Referral', ReferralSchema);
