/**
 * Profile Field Validators
 * 
 * Validation functions for all profile fields.
 */

import { VALIDATION_RULES, SUPPORTED_LANGUAGES } from '../constants/profile.constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate mobile number (Indian format)
 */
export function validateMobileNumber(mobileNumber: string): ValidationResult {
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
 * Validate name
 */
export function validateName(name: string): ValidationResult {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }

  if (name.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return {
      valid: false,
      error: `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`
    };
  }

  if (name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return {
      valid: false,
      error: `Name must not exceed ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`
    };
  }

  if (!VALIDATION_RULES.NAME.PATTERN.test(name)) {
    return {
      valid: false,
      error: 'Name can only contain letters and spaces'
    };
  }

  return { valid: true };
}

/**
 * Validate location coordinates or text
 */
export function validateLocation(location: any): ValidationResult {
  if (!location || typeof location !== 'object') {
    return {
      valid: false,
      error: 'Location must be an object'
    };
  }

  // Handle manual text location
  if (location.type === 'manual' && location.text) {
    if (typeof location.text !== 'string' || location.text.length < 3) {
      return {
        valid: false,
        error: 'Location text must be at least 3 characters'
      };
    }
    return { valid: true };
  }

  // Handle GPS coordinates
  if (location.type === 'gps' || (location.latitude && location.longitude)) {
    if (!location.latitude || !location.longitude) {
      return {
        valid: false,
        error: 'GPS location must include latitude and longitude'
      };
    }

    // Validate coordinates are within India boundaries (approximate)
    // India: Latitude 6°N to 37°N, Longitude 68°E to 98°E
    if (
      location.latitude < 6 ||
      location.latitude > 37 ||
      location.longitude < 68 ||
      location.longitude > 98
    ) {
      return {
        valid: false,
        error: 'Location coordinates must be within India boundaries'
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    error: 'Location must include either text (manual) or coordinates (GPS)'
  };
}

/**
 * Validate farm size
 */
export function validateFarmSize(farmSize: {
  value: number;
  unit: string;
}): ValidationResult {
  if (!farmSize.value || !farmSize.unit) {
    return {
      valid: false,
      error: 'Farm size must include value and unit'
    };
  }

  if (typeof farmSize.value !== 'number') {
    return {
      valid: false,
      error: 'Farm size value must be a number'
    };
  }

  if (
    farmSize.value < VALIDATION_RULES.FARM_SIZE.MIN ||
    farmSize.value > VALIDATION_RULES.FARM_SIZE.MAX
  ) {
    return {
      valid: false,
      error: `Farm size must be between ${VALIDATION_RULES.FARM_SIZE.MIN} and ${VALIDATION_RULES.FARM_SIZE.MAX}`
    };
  }

  if (!['acres', 'hectares'].includes(farmSize.unit)) {
    return {
      valid: false,
      error: 'Farm size unit must be acres or hectares'
    };
  }

  return { valid: true };
}

/**
 * Validate language preference
 */
export function validateLanguage(language: string): ValidationResult {
  if (!SUPPORTED_LANGUAGES.includes(language as any)) {
    return {
      valid: false,
      error: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate user type
 */
export function validateUserType(userType: string): ValidationResult {
  if (!['farmer', 'buyer', 'both'].includes(userType)) {
    return {
      valid: false,
      error: 'User type must be farmer, buyer, or both'
    };
  }

  return { valid: true };
}

/**
 * Validate profile picture file
 */
export function validateProfilePicture(
  file: { size: number; mimetype: string }
): ValidationResult {
  const maxSizeBytes = VALIDATION_RULES.PROFILE_PICTURE.MAX_SIZE_MB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Profile picture must be less than ${VALIDATION_RULES.PROFILE_PICTURE.MAX_SIZE_MB}MB`
    };
  }

  if (!VALIDATION_RULES.PROFILE_PICTURE.ALLOWED_FORMATS.includes(file.mimetype as any)) {
    return {
      valid: false,
      error: `Profile picture must be one of: ${VALIDATION_RULES.PROFILE_PICTURE.ALLOWED_FORMATS.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate any profile field
 */
export function validateField(fieldName: string, value: any): ValidationResult {
  switch (fieldName) {
    case 'mobileNumber':
      return validateMobileNumber(value);
    case 'name':
      return validateName(value);
    case 'location':
      return validateLocation(value);
    case 'farmSize':
      return validateFarmSize(value);
    case 'languagePreference':
      return validateLanguage(value);
    case 'userType':
      return validateUserType(value);
    default:
      // Unknown field - allow it
      return { valid: true };
  }
}
