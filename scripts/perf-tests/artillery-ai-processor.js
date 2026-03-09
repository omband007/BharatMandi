/**
 * Artillery Processor for AI Endpoint Testing
 * 
 * Handles:
 * - Image upload preparation
 * - Audio file preparation
 * - Mock authentication tokens
 * - Test data generation
 */

const fs = require('fs');
const path = require('path');

/**
 * Prepare image upload for diagnosis endpoint
 */
function prepareImageUpload(requestParams, context, ee, next) {
  // In a real test, you would load actual image files
  // For now, we'll use a placeholder or skip if file doesn't exist
  const imagePath = path.join(__dirname, 'test-data', 'sample-crop-disease.jpg');
  
  if (fs.existsSync(imagePath)) {
    // Image file exists, Artillery will handle the upload
    console.log('[Processor] Image file found for diagnosis test');
  } else {
    console.warn('[Processor] Warning: sample-crop-disease.jpg not found');
    // Skip this request
    return next(new Error('Test image not found'));
  }
  
  return next();
}

/**
 * Prepare image upload for grading endpoint
 */
function prepareGradingImage(requestParams, context, ee, next) {
  const imagePath = path.join(__dirname, 'test-data', 'sample-produce.jpg');
  
  if (fs.existsSync(imagePath)) {
    console.log('[Processor] Image file found for grading test');
  } else {
    console.warn('[Processor] Warning: sample-produce.jpg not found');
    return next(new Error('Test image not found'));
  }
  
  return next();
}

/**
 * Prepare audio upload for transcription endpoint
 */
function prepareAudioUpload(requestParams, context, ee, next) {
  const audioPath = path.join(__dirname, 'test-data', 'sample-audio.mp3');
  
  if (fs.existsSync(audioPath)) {
    console.log('[Processor] Audio file found for transcription test');
  } else {
    console.warn('[Processor] Warning: sample-audio.mp3 not found - skipping transcription test');
    // Skip this request gracefully
    return next(new Error('Test audio not found'));
  }
  
  return next();
}

/**
 * Generate mock authentication token
 * In production tests, you would use real JWT tokens
 */
function generateAuthToken(context, events, done) {
  // Mock JWT token for testing
  // In real tests, you would authenticate and get a real token
  context.vars.authToken = 'mock-jwt-token-for-testing';
  return done();
}

/**
 * Log AI response metrics
 */
function logAIMetrics(requestParams, response, context, ee, next) {
  if (response.statusCode === 200 || response.statusCode === 201) {
    try {
      const body = JSON.parse(response.body);
      
      // Log diagnosis metrics
      if (body.data && body.data.confidence) {
        console.log(`[AI Metrics] Diagnosis confidence: ${body.data.confidence}`);
      }
      
      // Log grading metrics
      if (body.gradingResult && body.gradingResult.grade) {
        console.log(`[AI Metrics] Grading result: ${body.gradingResult.grade}`);
      }
      
      // Log Kisan Mitra metrics
      if (body.intent && body.confidence) {
        console.log(`[AI Metrics] Kisan Mitra intent: ${body.intent}, confidence: ${body.confidence}`);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
  
  return next();
}

/**
 * Handle rate limit responses
 */
function handleRateLimit(requestParams, response, context, ee, next) {
  if (response.statusCode === 429) {
    console.log('[Rate Limit] Hit rate limit - this is expected during stress testing');
    // Emit custom metric
    ee.emit('counter', 'ai.rate_limits', 1);
  }
  
  return next();
}

/**
 * Track AI processing times
 */
function trackAIProcessingTime(requestParams, response, context, ee, next) {
  const responseTime = response.timings.phases.total;
  
  // Categorize by endpoint
  if (requestParams.url.includes('/diagnosis')) {
    ee.emit('histogram', 'ai.diagnosis.response_time', responseTime);
  } else if (requestParams.url.includes('/grading')) {
    ee.emit('histogram', 'ai.grading.response_time', responseTime);
  } else if (requestParams.url.includes('/kisan-mitra')) {
    ee.emit('histogram', 'ai.kisan_mitra.response_time', responseTime);
  } else if (requestParams.url.includes('/voice')) {
    ee.emit('histogram', 'ai.voice.response_time', responseTime);
  } else if (requestParams.url.includes('/translate')) {
    ee.emit('histogram', 'ai.translation.response_time', responseTime);
  }
  
  return next();
}

module.exports = {
  prepareImageUpload,
  prepareGradingImage,
  prepareAudioUpload,
  generateAuthToken,
  logAIMetrics,
  handleRateLimit,
  trackAIProcessingTime
};
