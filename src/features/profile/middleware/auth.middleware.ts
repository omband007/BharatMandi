/**
 * Authentication Middleware
 * 
 * JWT token verification middleware for protecting API routes.
 * 
 * CREATED FOR: Unified authentication & profile management
 * INTEGRATES WITH: src/features/profile/services/auth.service.ts
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import type { TokenPayload } from '../services/auth.service';

// Extend Express Request type to include user context
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Require authentication - reject requests without valid JWT token
 * Requirement 12.4: Validate tokens on protected API endpoints
 * 
 * Usage:
 * router.get('/protected', requireAuth, (req, res) => {
 *   // req.user is available here
 * });
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      });
      return;
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>'
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const verification = authService.verifyToken(token);

    if (!verification.valid || !verification.payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please log in again.'
      });
      return;
    }

    // Inject user context into request
    req.user = verification.payload;

    // Continue to next middleware/handler
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error in requireAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication - allow requests with or without JWT token
 * If token is provided and valid, inject user context
 * If token is invalid or missing, continue without user context
 * 
 * Usage:
 * router.get('/public-or-private', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // User is authenticated - show private content
 *   } else {
 *     // User is not authenticated - show public content
 *   }
 * });
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user context
    if (!authHeader) {
      next();
      return;
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      // Invalid format, but don't reject - just continue without user context
      next();
      return;
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify token
    const verification = authService.verifyToken(token);

    // If valid, inject user context
    if (verification.valid && verification.payload) {
      req.user = verification.payload;
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error in optionalAuth:', error);
    // Don't fail the request - just continue without user context
    next();
  }
}

/**
 * Require specific user - ensure authenticated user matches the userId in the route
 * 
 * Usage:
 * router.patch('/profiles/:userId', requireAuth, requireSelfOrAdmin, (req, res) => {
 *   // Only the user themselves or an admin can access this
 * });
 */
export function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    // This middleware should be used after requireAuth
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Get userId from route params
    const { userId } = req.params;

    // Check if authenticated user matches the userId in the route
    if (req.user.userId !== userId) {
      // TODO: Add admin role check here
      // For now, only allow users to access their own data
      res.status(403).json({
        success: false,
        error: 'Forbidden. You can only access your own data.'
      });
      return;
    }

    // User is authorized
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error in requireSelfOrAdmin:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
}

