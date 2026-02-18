import { UserType, Location, BankAccount } from '../../shared/types/common.types';

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: UserType;
  location: Location;
  bankAccount?: BankAccount;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserDTO {
  phoneNumber: string;
  name: string;
  userType: UserType;
  location: Location;
  bankAccount?: string;
}

export interface UpdateUserDTO {
  name?: string;
  location?: Location;
  phoneNumber?: string;
  bankAccount?: string;
}

export interface OTPSession {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  requiresVerification?: boolean;
}

export interface TokenPayload {
  userId: string;
  phoneNumber: string;
  userType: UserType;
}
