/**
 * Registration Service
 * 
 * Handles minimal registration (mobile number + OTP) and initial profile creation.
 */

import { v4 as uuidv4 } from 'uuid';
import { UserProfileModel } from '../models/profile.model';
import { DatabaseManager } from '../../../shared/database/database-manager';
import { VALIDATION_RULES, TRUST_SCORE_RULES, DEFAULT_PRIVACY_SETTINGS } from '../constants/profile.constants';
import type { UserProfile, RegisterRequest, RegisterResponse, VerifyOTPRequest, VerifyOTPResponse } from '../types/profile.types';
import type { OTPSession } from '../../auth/auth.types';

export class RegistrationService {
  private dbManager: DatabaseManager;
  private otpExpiryMinutes = 10;
  private maxOTPAttempts = 3;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Validate Indian mobile number format
   */
  validateMobileNumber(mobileNumber: string): { valid: boolean; error?: string } {
    // Remove any spaces or dashes
    const cleaned = mobileNumber.replace(/[\s-]/g, '');

    if (cleaned.length !== VALIDATION_RULES.MOBILE_NUMBER.LENGTH) {
      return {
        valid: false,
        error: `Mobile number must be ${VALIDATION_RULES.MOBILE_NUMBER.LENGTH} digits`
      };
    }

    if (!VALIDATION_RULES.MOBILE_NUMBER.PATTERN.test(cleaned)) {
      return {
        valid: false,
        error: 'Invalid Indian mobile number format. Must start with 6-9'
      };
    }

    return { valid: true };
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

    // Validate mobile number format
    const validation = this.validateMobileNumber(mobileNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if user already exists
    const existingUser = await UserProfileModel.findOne({ mobileNumber });
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

    // Create OTP session
    const otpSession: OTPSession = {
      phoneNumber: mobileNumber,
      otp,
      expiresAt,
      attempts: 0
    };

    await this.dbManager.createOTPSession(otpSession);

    // Send OTP
    const otpSent = await this.sendOTP(mobileNumber, otp);

    // Generate temporary userId for OTP verification
    const userId = uuidv4();

    return {
      userId,
      otpSent
    };
  }

  /**
   * Verify OTP and create user profile
   */
  async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    const { userId, otp } = request;

    // Get OTP session
    const session = await this.dbManager.getOTPSession(userId);
    if (!session) {
      throw new Error('OTP session not found or expired');
    }

    // Check if OTP has expired
    if (new Date() > session.expiresAt) {
      await this.dbManager.deleteOTPSession(session.phoneNumber);
      throw new Error('OTP has expired. Please request a new one');
    }

    // Check attempts
    if (session.attempts >= this.maxOTPAttempts) {
      await this.dbManager.deleteOTPSession(session.phoneNumber);
      throw new Error('Maximum OTP attempts exceeded. Please request a new OTP');
    }

    // Verify OTP
    if (session.otp !== otp) {
      // Increment attempts
      await this.dbManager.updateOTPAttempts(session.phoneNumber, session.attempts + 1);
      throw new Error('Invalid OTP');
    }

    // OTP verified - create user profile
    const profile = await this.createInitialProfile(session.phoneNumber);

    // Delete OTP session
    await this.dbManager.deleteOTPSession(session.phoneNumber);

    return {
      verified: true,
      profile
    };
  }

  /**
   * Create initial user profile with default values
   */
  private async createInitialProfile(mobileNumber: string): Promise<UserProfile> {
    const userId = uuidv4();
    const referralCode = await this.generateReferralCode();

    const profile: UserProfile = {
      userId,
      mobileNumber,
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
      }]
    };

    // Save to database
    const savedProfile = await UserProfileModel.create(profile);

    return savedProfile.toObject() as UserProfile;
  }

  /**
   * Resend OTP
   */
  async resendOTP(mobileNumber: string): Promise<boolean> {
    // Validate mobile number
    const validation = this.validateMobileNumber(mobileNumber);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Create new OTP session (this will delete the old one)
    const otpSession: OTPSession = {
      phoneNumber: mobileNumber,
      otp,
      expiresAt,
      attempts: 0
    };

    await this.dbManager.createOTPSession(otpSession);

    // Send OTP
    return await this.sendOTP(mobileNumber, otp);
  }
}
