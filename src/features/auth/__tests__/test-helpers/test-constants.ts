/**
 * Test Constants for Auth Controller Tests
 * 
 * Provides shared constants for phone numbers, PINs, user types,
 * supported languages, and SQL injection payloads.
 */

import { UserType } from '../../../../shared/types/common.types';

export const TEST_PHONE_NUMBERS = {
  VALID: '9876543210',
  WITH_COUNTRY_CODE: '+919876543210',
  WITH_91_PREFIX: '919876543210',
  INVALID_SHORT: '987654',
  INVALID_LONG: '98765432109876',
  INVALID_CHARS: '98765abcde'
};

export const TEST_PINS = {
  VALID_4_DIGIT: '1234',
  VALID_6_DIGIT: '123456',
  INVALID_SHORT: '12',
  INVALID_LONG: '1234567'
};

export const TEST_USER_TYPES = [
  UserType.FARMER,
  UserType.BUYER,
  UserType.LOGISTICS_PROVIDER
];

export const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa'
];

export const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "' OR 1=1--"
];
