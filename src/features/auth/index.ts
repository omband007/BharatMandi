// Public API - only export what other features need
export { authController } from './auth.controller';
export type { User, CreateUserDTO, UpdateUserDTO } from './auth.types';
export * from './auth.service';
