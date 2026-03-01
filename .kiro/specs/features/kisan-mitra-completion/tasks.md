# Implementation Tasks: Complete Kisan Mitra

**Feature:** Kisan Mitra Completion  
**Status:** Ready to Start  
**Related Documents:**
- [Requirements](./requirements.md)
- [Design](./design.md)

## Overview

This document outlines the implementation tasks to complete Kisan Mitra AI assistant with database integrations, conversation context, and privacy controls.

## Task List

### Phase 1: Database Integrations (Week 1)

- [x] 1. Implement Crop Price Handler
  - [x] 1.1 Create CropPriceHandler class
    - Create `src/features/i18n/handlers/crop-price.handler.ts`
    - Implement interface with handle() method
    - Add crop name normalization
    - _Requirements: 1.1_
  
  - [x] 1.2 Implement marketplace database queries
    - Query active listings by crop name
    - Filter by location if provided
    - Calculate average, min, max prices
    - _Requirements: 1.1_
  
  - [x] 1.3 Implement price trend calculation
    - Query historical prices (last 7 days)
    - Compare current vs historical average
    - Determine trend (up/down/stable)
    - _Requirements: 1.1_
  
  - [x] 1.4 Format response in user's language
    - Create response template
    - Include price statistics
    - Include trend indicator
    - Translate to user's language
    - _Requirements: 1.1_
  
  - [x] 1.5 Handle crop not found
    - Return helpful error message
    - Suggest similar crop names
    - _Requirements: 1.1_
  
  - [x] 1.6 Write unit tests for CropPriceHandler
    - Test with valid crop
    - Test with invalid crop
    - Test with location filter
    - Test trend calculation
    - _Requirements: 1.1_

- [x] 2. Implement Weather Handler
  - [x] 2.1 Set up OpenWeatherMap API integration
    - Install axios or fetch
    - Configure API key in environment
    - Create WeatherAPI client
    - _Requirements: 1.2_
  
  - [x] 2.2 Create WeatherHandler class
    - Create `src/features/i18n/handlers/weather.handler.ts`
    - Implement interface with handle() method
    - _Requirements: 1.2_
  
  - [x] 2.3 Implement geocoding
    - Convert location name to coordinates
    - Use OpenWeatherMap geocoding API
    - Cache geocoding results
    - _Requirements: 1.2_
  
  - [x] 2.4 Fetch current weather and forecast
    - Get current weather data
    - Get 3-day forecast
    - Parse API response
    - _Requirements: 1.2_
  
  - [x] 2.5 Generate farming advice based on weather
    - Create rule-based advice generator
    - Handle rain, temperature, humidity
    - Provide actionable recommendations
    - _Requirements: 1.2_
  
  - [x] 2.6 Format response in user's language
    - Create response template
    - Include current weather
    - Include forecast
    - Include farming advice
    - Translate to user's language
    - _Requirements: 1.2_
  
  - [x] 2.7 Write unit tests for WeatherHandler
    - Test with valid location
    - Test with invalid location
    - Test advice generation
    - Mock weather API
    - _Requirements: 1.2_

- [x] 3. Implement Farming Advice Handler
  - [x] 3.1 Design farming tips knowledge base schema
    - Create MongoDB collection schema
    - Define fields (crop, topic, advice, tips, etc.)
    - _Requirements: 1.3_
  
  - [x] 3.2 Create farming tips seed data
    - Collect farming tips for top 20 crops
    - Cover topics: planting, irrigation, pest control, harvesting
    - Create seed data in English
    - _Requirements: 1.3_
  
  - [x] 3.3 Translate farming tips to all languages
    - Use AWS Translate for initial translation
    - Review and refine translations
    - Store in MongoDB
    - _Requirements: 1.3_
  
  - [x] 3.4 Create FarmingAdviceHandler class
    - Create `src/features/i18n/handlers/farming-advice.handler.ts`
    - Implement interface with handle() method
    - _Requirements: 1.3_
  
  - [x] 3.5 Implement knowledge base queries
    - Query by crop and topic
    - Use fuzzy matching for crop names
    - Aggregate advice from multiple tips
    - _Requirements: 1.3_
  
  - [x] 3.6 Format response in user's language
    - Create response template
    - Include advice and tips
    - Include references
    - _Requirements: 1.3_
  
  - [x] 3.7 Write unit tests for FarmingAdviceHandler
    - Test with valid crop and topic
    - Test with invalid crop
    - Test fuzzy matching
    - _Requirements: 1.3_

- [x] 4. Integrate handlers with Kisan Mitra Service
  - [x] 4.1 Create handler registry
    - Map intents to handlers
    - Register all handlers
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 4.2 Update processQuery() to call handlers
    - Extract intent from Lex response
    - Extract slots from Lex response
    - Call appropriate handler
    - Format handler response
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 4.3 Handle handler errors gracefully
    - Catch handler exceptions
    - Return helpful error messages
    - Log errors for debugging
    - _Requirements: 5.1_
  
  - [x] 4.4 Write integration tests
    - Test crop price query end-to-end
    - Test weather query end-to-end
    - Test farming advice query end-to-end
    - _Requirements: 1.1, 1.2, 1.3_

### Phase 2: Conversation Context (Week 2)

- [ ] 5. Implement Session Management
  - [ ] 5.1 Choose session storage (Redis or MongoDB)
    - Evaluate Redis vs MongoDB
    - Set up chosen storage
    - Configure connection
    - _Requirements: 2.1_
  
  - [ ] 5.2 Create SessionManager interface
    - Define getSession(), updateSession(), clearSession()
    - Create `src/features/i18n/session-manager.ts`
    - _Requirements: 2.1_
  
  - [ ] 5.3 Implement RedisSessionManager (if using Redis)
    - Implement SessionManager interface
    - Use Redis for storage
    - Set 5-minute TTL
    - _Requirements: 2.1_
  
  - [ ] 5.4 Implement MongoSessionManager (if using MongoDB)
    - Implement SessionManager interface
    - Use MongoDB for storage
    - Create TTL index for auto-expiration
    - _Requirements: 2.1_
  
  - [ ] 5.5 Integrate session management in processQuery()
    - Retrieve session before Lex call
    - Pass session attributes to Lex
    - Update session after Lex call
    - _Requirements: 2.1_
  
  - [ ] 5.6 Write unit tests for SessionManager
    - Test session creation
    - Test session retrieval
    - Test session update
    - Test session expiration
    - _Requirements: 2.1_

- [ ] 6. Implement Context Extraction
  - [ ] 6.1 Create ContextExtractor class
    - Create `src/features/i18n/context-extractor.ts`
    - Implement extractContext() method
    - _Requirements: 2.2_
  
  - [ ] 6.2 Extract context from conversation history
    - Get last N queries from database
    - Extract last intent, slots, entities
    - Identify conversation topic
    - _Requirements: 2.2_
  
  - [ ] 6.3 Handle pronouns and references
    - Detect pronouns ("it", "that", "them")
    - Resolve to entities from context
    - Replace pronouns in query
    - _Requirements: 2.2_
  
  - [ ] 6.4 Pass context to Lex
    - Add context to session attributes
    - Lex uses context for slot filling
    - _Requirements: 2.2_
  
  - [ ] 6.5 Write unit tests for ContextExtractor
    - Test context extraction
    - Test pronoun resolution
    - Test with empty history
    - _Requirements: 2.2_

- [ ] 7. Implement Language Switching
  - [ ] 7.1 Detect language switch in query
    - Check if language changed from previous query
    - Detect explicit language switch commands
    - _Requirements: 2.3_
  
  - [ ] 7.2 Translate context to new language
    - Translate previous context
    - Update session attributes
    - _Requirements: 2.3_
  
  - [ ] 7.3 Notify user of language change
    - Add language change indicator to response
    - Confirm new language
    - _Requirements: 2.3_
  
  - [ ] 7.4 Write unit tests for language switching
    - Test language switch detection
    - Test context translation
    - Test notification
    - _Requirements: 2.3_

### Phase 3: History & Privacy (Week 2-3)

- [ ] 8. Implement Conversation History API
  - [ ] 8.1 Create history routes
    - Create `src/features/i18n/kisan-mitra.routes.ts` (if not exists)
    - Add GET /api/kisan-mitra/history/:userId
    - Add DELETE /api/kisan-mitra/history/:userId
    - Add GET /api/kisan-mitra/stats
    - _Requirements: 3.1_
  
  - [ ] 8.2 Implement getConversationHistory() with pagination
    - Add limit and offset parameters
    - Query MongoDB with pagination
    - Return total count and hasMore flag
    - _Requirements: 3.1_
  
  - [ ] 8.3 Implement deleteUserHistory()
    - Delete all conversations for user
    - Return deleted count
    - _Requirements: 3.2_
  
  - [ ] 8.4 Implement getStats() with language distribution
    - Add language distribution to stats
    - Calculate percentages
    - _Requirements: 3.1_
  
  - [ ] 8.5 Write API tests
    - Test history retrieval
    - Test pagination
    - Test history deletion
    - Test stats endpoint
    - _Requirements: 3.1, 3.2_

- [ ] 9. Implement Privacy Controls
  - [ ] 9.1 Create PrivacyManager class
    - Create `src/features/i18n/privacy-manager.ts`
    - Implement cleanupOldConversations()
    - Implement anonymizeConversation()
    - Implement deleteUserHistory()
    - _Requirements: 3.2_
  
  - [ ] 9.2 Set up scheduled cleanup job
    - Create cron job to run daily
    - Delete conversations older than 30 days
    - Log cleanup results
    - _Requirements: 3.2_
  
  - [ ] 9.3 Implement audio file cleanup
    - Delete audio files after transcription
    - Create AudioCleanupService
    - Cleanup failed transcription jobs
    - _Requirements: 3.3_
  
  - [ ] 9.4 Add privacy settings to user profile
    - Add data retention preference
    - Add auto-delete option
    - Store in user database
    - _Requirements: 3.2_
  
  - [ ] 9.5 Write unit tests for PrivacyManager
    - Test old conversation cleanup
    - Test anonymization
    - Test user history deletion
    - _Requirements: 3.2, 3.3_

### Phase 4: Enhanced Features (Week 3)

- [ ] 10. Implement Help Intent
  - [ ] 10.1 Create HelpHandler class
    - Create `src/features/i18n/handlers/help.handler.ts`
    - List available features
    - Provide example queries
    - _Requirements: 4.2_
  
  - [ ] 10.2 Format help response
    - Create help template
    - Include feature list
    - Include example queries
    - Translate to user's language
    - _Requirements: 4.2_
  
  - [ ] 10.3 Write unit tests for HelpHandler
    - Test help response generation
    - Test translation
    - _Requirements: 4.2_

- [ ] 11. Implement Escalation to Human Support
  - [ ] 11.1 Detect user frustration
    - Track consecutive unrecognized queries
    - Detect frustration keywords
    - Offer escalation after 3 failed queries
    - _Requirements: 5.2_
  
  - [ ] 11.2 Create support ticket
    - Create support_tickets collection in MongoDB
    - Store conversation context
    - Generate ticket ID
    - _Requirements: 5.2_
  
  - [ ] 11.3 Notify support team
    - Send email/SMS to support team
    - Include ticket ID and context
    - _Requirements: 5.2_
  
  - [ ] 11.4 Provide ticket ID to user
    - Return ticket ID in response
    - Explain next steps
    - _Requirements: 5.2_
  
  - [ ] 11.5 Write unit tests for escalation
    - Test frustration detection
    - Test ticket creation
    - Test notification
    - _Requirements: 5.2_

### Phase 5: Testing & Refinement (Week 3)

- [ ] 12. Write comprehensive tests
  - [ ] 12.1 Unit tests for all handlers
    - CropPriceHandler
    - WeatherHandler
    - FarmingAdviceHandler
    - HelpHandler
    - _Requirements: All_
  
  - [ ] 12.2 Integration tests for database queries
    - Test marketplace queries
    - Test MongoDB queries
    - Test Redis operations
    - _Requirements: All_
  
  - [ ] 12.3 E2E tests for conversation flows
    - Test crop price query flow
    - Test weather query flow
    - Test farming advice flow
    - Test follow-up questions
    - Test language switching
    - _Requirements: All_
  
  - [ ] 12.4 Load tests
    - Test with 100 concurrent conversations
    - Measure response times
    - Verify performance targets
    - _Requirements: Non-functional_

- [ ] 13. Documentation
  - [ ] 13.1 Update API documentation
    - Document new endpoints
    - Add request/response examples
    - Document error codes
    - _Requirements: All_
  
  - [ ] 13.2 Create user guide
    - How to use Kisan Mitra
    - Example conversations
    - Troubleshooting tips
    - _Requirements: All_
  
  - [ ] 13.3 Create admin guide
    - How to manage knowledge base
    - How to review conversations
    - How to handle escalations
    - _Requirements: All_

- [ ] 14. Deployment preparation
  - [ ] 14.1 Set up environment variables
    - OPENWEATHER_API_KEY
    - MONGODB_URI
    - REDIS_URL (if using Redis)
    - _Requirements: All_
  
  - [ ] 14.2 Create database migrations
    - Create farming_tips collection
    - Create indexes
    - Seed initial data
    - _Requirements: All_
  
  - [ ] 14.3 Set up monitoring
    - CloudWatch metrics
    - Error logging
    - Performance monitoring
    - _Requirements: Non-functional_
  
  - [ ] 14.4 Create deployment checklist
    - Pre-deployment checks
    - Deployment steps
    - Post-deployment verification
    - _Requirements: All_

## Success Criteria

- [ ] Crop price queries return real data from marketplace
- [ ] Weather queries return real weather data
- [ ] Farming advice queries return relevant tips
- [ ] Conversation context maintained across queries
- [ ] Follow-up questions work correctly
- [ ] Conversation history API functional
- [ ] Privacy controls implemented
- [ ] Response time < 3 seconds
- [ ] All tests passing
- [ ] Documentation complete

## Notes

- Focus on MVP features first (crop prices, weather, basic advice)
- Defer advanced features (navigation, listing creation) to v2
- Prioritize performance and reliability
- Ensure privacy compliance

## Timeline

- **Week 1:** Database integrations (Tasks 1-4)
- **Week 2:** Conversation context (Tasks 5-7)
- **Week 2-3:** History & privacy (Tasks 8-9)
- **Week 3:** Enhanced features & testing (Tasks 10-14)

**Total:** 2-3 weeks

