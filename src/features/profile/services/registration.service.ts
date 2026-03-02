/**
 * Registration Service
 * 
 * Handles minimal registration (mobile number + OTP) and initial profile creation.
 */

import { v4 as uuidv4 } from 'uuid';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { UserProfileModel } from '../models/profile.model';
import * as sqliteHelpers from '../../../shared/database/sqlite-helpers';
import { VALIDATION_RULES, TRUST_SCORE_RULES, DEFAULT_PRIVACY_SETTINGS } from '../constants/profile.constants';
import * as authService from './auth.service';
import type { UserProfile, RegisterRequest, RegisterResponse, VerifyOTPRequest, VerifyOTPResponse, PrivacyLevel, OTPSession } from '../types/profile.types';

export class RegistrationService {
  private otpExpiryMinutes = 10;
  private maxOTPAttempts = 3;

  constructor() {
    // No initialization needed - using sqliteHelpers directly
  }

  /**
   * Validate and normalize mobile number (international format support)
   * 
   * Accepts:
   * - 10 digits (assumes India +91): "9876543210" → "+919876543210"
   * - Full international format: "+447700900123", "+919876543210"
   * 
   * Returns normalized E.164 format and country code
   */
  validateMobileNumber(mobileNumber: string): { 
    valid: boolean; 
    normalized?: string; 
    countryCode?: string;
    error?: string;
  } {
    // Remove any spaces or dashes
    const cleaned = mobileNumber.replace(/[\s-]/g, '');

    // Case 1: 10-digit Indian number (legacy support)
    if (cleaned.length === VALIDATION_RULES.MOBILE_NUMBER.LENGTH && !cleaned.startsWith('+')) {
      // Validate Indian mobile format (starts with 6-9)
      if (!VALIDATION_RULES.MOBILE_NUMBER.PATTERN.test(cleaned)) {
        return {
          valid: false,
          error: 'Invalid Indian mobile number format. Must start with 6-9'
        };
      }

      // Normalize to E.164 format with +91
      return {
        valid: true,
        normalized: `+91${cleaned}`,
        countryCode: 'IN'
      };
    }

    // Case 2: Full international format (starts with +)
    if (cleaned.startsWith('+')) {
      try {
        // Validate using libphonenumber-js
        if (!isValidPhoneNumber(cleaned)) {
          return {
            valid: false,
            error: 'Invalid international phone number format'
          };
        }

        // Parse to get country code and normalized format
        const phoneNumber = parsePhoneNumber(cleaned);
        
        return {
          valid: true,
          normalized: phoneNumber.number, // E.164 format
          countryCode: phoneNumber.country
        };
      } catch (error) {
        return {
          valid: false,
          error: 'Failed to parse international phone number'
        };
      }
    }

    // Invalid format
    return {
      valid: false,
      error: 'Mobile number must be 10 digits (Indian) or full international format with country code (e.g., +447700900123)'
    };
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a unique referral code
   */
  private async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < VALIDATION_RULES.REFERRAL_CODE.LENGTH; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code already exists
      const existing = await UserProfileModel.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
        return code;
      }
    }

    throw new Error('Failed to generate unique referral code');
  }

  /**
   * Send OTP via SMS gateway
   * TODO: Integrate with actual SMS gateway (Twilio/AWS SNS)
   */
  private async sendOTP(mobileNumber: string, otp: string): Promise<boolean> {
    // For now, just log the OTP (in production, send via SMS gateway)
    console.log(`[Registration] OTP for ${mobileNumber}: ${otp}`);
    
    // TODO: Implement actual SMS sending
    // Example with Twilio:
    // await twilioClient.messages.create({
    //   body: `Your Bharat Mandi verification code is: ${otp}`,
    //   to: `+91${mobileNumber}`,
    //   from: process.env.TWILIO_PHONE_NUMBER
    // });

    return true;
  }

  /**
   * Initiate registration - validate mobile number and send OTP
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const { mobileNumber, referralCode } = request;

    // Validate and normalize mobile number
    const validation = this.validateMobileNumber(mobileNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalizedMobile = validation.normalized!;

    // Check if user already exists (using normalized mobile number)
    const existingUser = await UserProfileModel.findOne({ mobileNumber: normalizedMobile });
    if (existingUser) {
      throw new Error('User with this mobile number already exists');
    }

    // Validate referral code if provided
    if (referralCode) {
      const referrer = await UserProfileModel.findOne({ referralCode });
      if (!referrer) {
        throw new Error('Invalid referral code');
      }
    }

    // Generate OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Create OTP session (use normalized mobile number)
    const otpSession: OTPSession = {
      phoneNumber: normalizedMobile,
      otp,
      expiresAt,
      attempts: 0
    };

    await sqliteHelpers.createOTPSession(otpSession);

    // Send OTP
    const otpSent = await this.sendOTP(normalizedMobile, otp);

    return {
      userId: normalizedMobile, // Return normalized mobile number as userId for OTP verification
      otpSent
    };
  }

  /**
   * Verify OTP and create user profile
   * After verification, offer optional PIN and biometric setup
   */
  async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    const { userId, otp } = request;

    // Get OTP session
    const session = await sqliteHelpers.getOTPSession(userId);
    if (!session) {
      throw new Error('OTP session not found or expired');
    }

    // Check if OTP has expired
    if (new Date() > session.expiresAt) {
      await sqliteHelpers.deleteOTPSession(session.phoneNumber);
      throw new Error('OTP has expired. Please request a new one');
    }

    // Check attempts
    if (session.attempts >= this.maxOTPAttempts) {
      await sqliteHelpers.deleteOTPSession(session.phoneNumber);
      throw new Error('Maximum OTP attempts exceeded. Please request a new OTP');
    }

    // Verify OTP
    if (session.otp !== otp) {
      // Increment attempts
      await sqliteHelpers.updateOTPAttempts(session.phoneNumber, session.attempts + 1);
      throw new Error('Invalid OTP');
    }

    // OTP verified - create user profile
    const profile = await this.createInitialProfile(session.phoneNumber);

    // Delete OTP session
    await sqliteHelpers.deleteOTPSession(session.phoneNumber);

    // Generate JWT token for authenticated session
    const token = authService.generateToken(profile);

    return {
      verified: true,
      profile,
      token  // Return JWT token for immediate authentication
    };
  }

  /**
   * Create initial user profile with default values
   * Stores mobile number in E.164 international format
   */
  private async createInitialProfile(mobileNumber: string): Promise<UserProfile> {
    const userId = uuidv4();
    const referralCode = await this.generateReferralCode();

    // Extract country code from E.164 format
    let countryCode: string | undefined;
    try {
      const phoneNumber = parsePhoneNumber(mobileNumber);
      countryCode = phoneNumber.country;
    } catch (error) {
      console.warn('[RegistrationService] Failed to extract country code:', error);
      // Default to India if parsing fails
      countryCode = 'IN';
    }

    const profile: UserProfile = {
      userId,
      mobileNumber,  // Already in E.164 format (e.g., +919876543210, +447700900123)
      mobileVerified: true,
      
      // Optional fields - all null initially
      name: undefined,
      profilePicture: undefined,
      location: undefined,
      userType: undefined,
      cropsGrown: undefined,
      farmSize: undefined,
      languagePreference: undefined,
      bankAccount: undefined,
      
      // Metadata
      completionPercentage: 10, // Only mobile number verified
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      
      // Privacy settings - all platform_only by default
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
      
      // Gamification - initial values
      points: {
        current: 0,
        lifetime: 0,
        lastUpdated: new Date()
      },
      membershipTier: 'bronze',
      referralCode,
      referredBy: undefined,
      dailyStreak: 0,
      lastStreakDate: undefined,
      
      // Trust score - initial value
      trustScore: TRUST_SCORE_RULES.INITIAL,
      trustScoreHistory: [{
        timestamp: new Date(),
        change: TRUST_SCORE_RULES.INITIAL,
        reason: 'Initial registration',
        newScore: TRUST_SCORE_RULES.INITIAL
      }],

      // Authentication fields - initialized for optional PIN/biometric setup
      pinHash: undefined,
      biometricEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: new Date()
    };

    // Save to database
    const savedProfile = await UserProfileModel.create(profile);

    // Convert Map to Record for type compatibility
    const privacySettingsObj: Record<string, PrivacyLevel> = {};
    savedProfile.privacySettings.forEach((value, key) => {
      privacySettingsObj[key] = value as PrivacyLevel;
    });

    return {
      ...savedProfile.toObject(),
      privacySettings: privacySettingsObj
    } as UserProfile;
  }

  /**
   * Resend OTP
   */
  async resendOTP(mobileNumber: string): Promise<boolean> {
    // Validate and normalize mobile number
    const validation = this.validateMobileNumber(mobileNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalizedMobile = validation.normalized!;

    // Generate new OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Create new OTP session (this will delete the old one)
    const otpSession: OTPSession = {
      phoneNumber: normalizedMobile,
      otp,
      expiresAt,
      attempts: 0
    };

    await sqliteHelpers.createOTPSession(otpSession);

    // Send OTP
    return await this.sendOTP(normalizedMobile, otp);
  }
}
