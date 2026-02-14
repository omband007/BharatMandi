# Requirements Document: Bharat Mandi

## Introduction

Bharat Mandi is a mobile platform designed to empower farmers by solving systemic issues in agricultural trade and access to credit. The platform addresses the exploitation farmers face during crop selection, harvest, and sale by providing objective produce grading, secure payment mechanisms, verifiable farming activity logs, and a credibility scoring system that enables access to formal credit.

## Glossary

- **Farmer**: Agricultural producer who grows and sells crops
- **Buyer**: Trader or merchant who purchases agricultural produce from farmers
- **Bharat_Mandi_Platform**: The mobile application system that facilitates produce grading, transactions, and credit scoring
- **Fasal_Parakh_Module**: The Edge AI-powered produce grading component
- **Digital_Quality_Certificate**: Machine-generated document certifying produce quality based on AI analysis
- **Escrow_System**: Secure payment mechanism that holds buyer funds until delivery confirmation
- **Nodal_Account**: Secure third-party account that holds escrowed funds during transaction
- **Photo_Log**: Visual timeline of farming activities captured by farmers
- **Credibility_Score**: Credit rating calculated from farming activities, sales history, and reliability metrics
- **Edge_AI**: Artificial intelligence that runs locally on the smartphone without internet connectivity
- **Proof_of_Work**: Verifiable evidence of farming activities through photo logs and transaction history
- **Digital_Mandi**: Online marketplace where farmers list produce and buyers place orders
- **Kisan_Konnect**: Ecosystem connection module linking farmers with suppliers, buyers, cold storage, and logistics providers
- **Kisan_Mitra**: AI-powered vernacular voice assistant for answering farmer queries
- **P2P_Marketplace**: Peer-to-peer marketplace for farmers to exchange agricultural inputs
- **Price_Prophecy_Module**: AI-powered price prediction system for market forecasting
- **Rating_System**: Automated and user-generated feedback mechanism for farmers and buyers
- **Logistics_Provider**: Third-party service that handles transportation of produce
- **Cold_Storage_Provider**: Third-party service that provides temperature-controlled storage facilities
- **Supplier**: Entity that provides agricultural inputs like seeds, fertilizers, and equipment

## Requirements

### Requirement 1: Fasal-Parakh (AI Quality Grading)

**User Story:** As a farmer, I want to grade my produce objectively using my smartphone, so that I can prove quality to remote buyers and get fair prices.

#### Acceptance Criteria

1. WHEN a farmer captures a photo of produce using the smartphone camera, THE Fasal_Parakh_Module SHALL analyze the image within 5 seconds
2. WHEN analyzing produce images, THE Fasal_Parakh_Module SHALL evaluate size, shape, color uniformity, and visible defects
3. WHEN analysis is complete, THE Fasal_Parakh_Module SHALL assign a quality grade of A, B, or C based on the evaluation
4. WHEN a quality grade is assigned, THE Bharat_Mandi_Platform SHALL generate a Digital_Quality_Certificate with grade, timestamp, and GPS coordinates
5. WHERE internet connectivity is unavailable, THE Fasal_Parakh_Module SHALL perform all grading operations offline using Edge_AI
6. WHEN a farmer completes grading, THE Bharat_Mandi_Platform SHALL allow the farmer to list the produce with the attached Digital_Quality_Certificate
7. WHEN buyers view produce listings, THE Bharat_Mandi_Platform SHALL display the Digital_Quality_Certificate alongside produce details

### Requirement 2: Smart Escrow Payments

**User Story:** As a farmer, I want guaranteed payment with AI-validated delivery, so that I am protected from payment defaults and delivery disputes.

#### Acceptance Criteria

1. WHEN a buyer commits to purchase produce, THE Escrow_System SHALL require the buyer to deposit the full payment amount into the Nodal_Account
2. WHEN payment is deposited, THE Escrow_System SHALL lock the funds and prevent withdrawal by the buyer
3. WHEN funds are locked, THE Bharat_Mandi_Platform SHALL notify the farmer that payment is secured
4. WHEN the farmer confirms produce has been loaded for transport, THE Bharat_Mandi_Platform SHALL record the dispatch timestamp
5. WHEN produce is delivered, THE Bharat_Mandi_Platform SHALL require the buyer to capture a photo of received produce
6. WHEN delivery photo is captured, THE Fasal_Parakh_Module SHALL validate the produce quality matches the original Digital_Quality_Certificate
7. WHEN AI validates successful delivery, THE Escrow_System SHALL automatically release funds from the Nodal_Account to the farmer's account within 1 hour
8. IF AI validation fails due to quality mismatch, THEN THE Escrow_System SHALL initiate a dispute resolution process
9. WHEN funds are released, THE Bharat_Mandi_Platform SHALL notify both farmer and buyer of the completed transaction

### Requirement 3: Photo-Log (Digital Diary)

**User Story:** As a farmer, I want to create a visual timeline of my farming activities, so that I can maintain records for planning, bank loans, and insurance.

#### Acceptance Criteria

1. WHEN a farmer captures a photo of farming activity, THE Bharat_Mandi_Platform SHALL store the image with GPS coordinates and timestamp
2. WHEN storing photos, THE Bharat_Mandi_Platform SHALL allow farmers to tag activities with predefined categories
3. THE Bharat_Mandi_Platform SHALL support activity categories including tilling, sowing, spraying, fertigation, and harvest
4. WHEN a farmer views their Photo_Log, THE Bharat_Mandi_Platform SHALL display activities in chronological timeline format with associated metadata
5. WHEN analyzing Photo_Log data, THE Bharat_Mandi_Platform SHALL identify patterns and suggest optimal timing for future activities
6. WHEN a farmer completes a sale, THE Bharat_Mandi_Platform SHALL link the Photo_Log entries to the transaction record
7. WHEN a farmer applies for a bank loan or insurance, THE Bharat_Mandi_Platform SHALL allow export of Photo_Log as verifiable Proof_of_Work
8. WHERE internet connectivity is available, THE Bharat_Mandi_Platform SHALL sync Photo_Log data to cloud storage
9. WHERE internet connectivity is unavailable, THE Bharat_Mandi_Platform SHALL store Photo_Log data locally and sync when connection is restored

### Requirement 4: Credibility Score Calculation

**User Story:** As a farmer, I want to build a credibility score based on my farming activities, so that I can access formal credit from financial institutions.

#### Acceptance Criteria

1. WHEN a farmer completes a transaction, THE Bharat_Mandi_Platform SHALL update the farmer's Credibility_Score based on transaction value and buyer feedback
2. WHEN analyzing Photo_Log data, THE Bharat_Mandi_Platform SHALL incorporate farming activity consistency into the Credibility_Score
3. WHEN calculating Credibility_Score, THE Bharat_Mandi_Platform SHALL consider payment reliability, delivery timeliness, and produce quality ratings
4. WHEN a Credibility_Score changes, THE Bharat_Mandi_Platform SHALL maintain a historical record of score changes with timestamps
5. WHEN a farmer views their profile, THE Bharat_Mandi_Platform SHALL display the current Credibility_Score with breakdown of contributing factors
6. WHEN a financial institution requests farmer data, THE Bharat_Mandi_Platform SHALL provide the Credibility_Score and supporting transaction history with farmer consent
7. WHEN a new farmer joins, THE Bharat_Mandi_Platform SHALL initialize their Credibility_Score at a baseline value

### Requirement 5: User Authentication and Profile Management

**User Story:** As a user, I want to securely access my account and manage my profile, so that my data and transactions are protected.

#### Acceptance Criteria

1. WHEN a new user registers, THE Bharat_Mandi_Platform SHALL require mobile number verification via OTP
2. WHEN a user registers, THE Bharat_Mandi_Platform SHALL collect user type, name, location, and bank account details
3. WHEN a user logs in, THE Bharat_Mandi_Platform SHALL authenticate using mobile number and PIN or biometric authentication
4. WHEN authentication fails three consecutive times, THE Bharat_Mandi_Platform SHALL temporarily lock the account for 30 minutes
5. WHEN a user updates profile information, THE Bharat_Mandi_Platform SHALL validate the changes and require re-verification for sensitive data
6. WHEN a user views their profile, THE Bharat_Mandi_Platform SHALL display all account information, transaction history, and relevant scores
7. WHERE a user is a farmer, THE Bharat_Mandi_Platform SHALL display Credibility_Score and Photo_Log access

### Requirement 6: Digital Mandi (Marketplace)

**User Story:** As a farmer, I want to list my produce with quality certificates in a marketplace, so that buyers can discover and purchase my crops with confidence.

#### Acceptance Criteria

1. WHEN a farmer creates a listing, THE Digital_Mandi SHALL require produce type, quantity, expected harvest date, price, and attached Digital_Quality_Certificate
2. WHEN a listing is created, THE Digital_Mandi SHALL assign a unique listing identifier and publish it to the marketplace
3. WHEN buyers search for produce, THE Digital_Mandi SHALL filter results by produce type, location, quality grade, price range, and availability date
4. WHEN a buyer views a listing, THE Digital_Mandi SHALL display produce details, Digital_Quality_Certificate, farmer's rating, and location
5. WHEN displaying listings, THE Digital_Mandi SHALL show the farmer's historical rating based on past transactions
6. WHEN a listing expires or produce is sold, THE Digital_Mandi SHALL mark the listing as unavailable and remove it from active searches
7. WHEN a farmer updates a listing, THE Digital_Mandi SHALL preserve the original Digital_Quality_Certificate unless a new grading is performed
8. WHEN displaying listings, THE Digital_Mandi SHALL prioritize farmers with higher ratings in search results

### Requirement 7: Transaction Management

**User Story:** As a buyer, I want to initiate and track purchases, so that I can manage my procurement efficiently.

#### Acceptance Criteria

1. WHEN a buyer selects a listing, THE Bharat_Mandi_Platform SHALL allow the buyer to initiate a purchase request
2. WHEN a purchase request is sent, THE Bharat_Mandi_Platform SHALL notify the farmer and await acceptance
3. WHEN a farmer accepts a purchase request, THE Bharat_Mandi_Platform SHALL create a transaction record with agreed terms
4. WHEN a transaction is created, THE Bharat_Mandi_Platform SHALL require the buyer to deposit funds into the Escrow_System
5. WHEN tracking a transaction, THE Bharat_Mandi_Platform SHALL display current status, payment status, and delivery timeline
6. WHEN either party updates transaction status, THE Bharat_Mandi_Platform SHALL notify the other party immediately
7. WHEN a transaction is completed, THE Bharat_Mandi_Platform SHALL prompt both parties to provide feedback and ratings

### Requirement 8: Offline Functionality

**User Story:** As a farmer in a rural area, I want to use core features without internet connectivity, so that poor network coverage does not prevent me from using the platform.

#### Acceptance Criteria

1. WHERE internet connectivity is unavailable, THE Fasal_Parakh_Module SHALL perform produce grading using locally stored Edge_AI models
2. WHERE internet connectivity is unavailable, THE Bharat_Mandi_Platform SHALL allow farmers to capture and store Photo_Log entries locally
3. WHERE internet connectivity is unavailable, THE Bharat_Mandi_Platform SHALL allow farmers to view their existing listings and transaction history from local cache
4. WHEN internet connectivity is restored, THE Bharat_Mandi_Platform SHALL automatically sync all locally stored data to the cloud
5. WHERE internet connectivity is unavailable, THE Bharat_Mandi_Platform SHALL prevent actions that require real-time verification
6. WHEN syncing data, THE Bharat_Mandi_Platform SHALL resolve conflicts by prioritizing server data for transaction states and merging Photo_Log entries
7. WHEN offline mode is active, THE Bharat_Mandi_Platform SHALL display a clear indicator to users

### Requirement 9: Notifications and Alerts

**User Story:** As a user, I want to receive timely notifications about important events, so that I can respond quickly to opportunities and obligations.

#### Acceptance Criteria

1. WHEN a farmer receives a purchase request, THE Bharat_Mandi_Platform SHALL send a push notification within 1 minute
2. WHEN funds are deposited in escrow, THE Bharat_Mandi_Platform SHALL notify the farmer immediately
3. WHEN a buyer confirms delivery, THE Bharat_Mandi_Platform SHALL notify the farmer of fund release
4. WHEN a transaction status changes, THE Bharat_Mandi_Platform SHALL send notifications to both parties
5. WHEN a user's Credibility_Score changes significantly, THE Bharat_Mandi_Platform SHALL notify the user with details
6. WHERE push notifications are disabled, THE Bharat_Mandi_Platform SHALL display in-app notifications on the home screen
7. WHEN a dispute is initiated, THE Bharat_Mandi_Platform SHALL send urgent notifications to both parties and support team

### Requirement 10: Data Privacy and Security

**User Story:** As a user, I want my personal and financial data to be secure, so that I can trust the platform with sensitive information.

#### Acceptance Criteria

1. WHEN storing user data, THE Bharat_Mandi_Platform SHALL encrypt all personal and financial information using industry-standard encryption
2. WHEN transmitting data over the network, THE Bharat_Mandi_Platform SHALL use secure HTTPS connections with TLS 1.3 or higher
3. WHEN a financial institution requests farmer data, THE Bharat_Mandi_Platform SHALL require explicit farmer consent before sharing
4. WHEN a user requests data deletion, THE Bharat_Mandi_Platform SHALL remove all personal data within 30 days while preserving anonymized transaction records for audit purposes
5. WHEN detecting suspicious activity, THE Bharat_Mandi_Platform SHALL temporarily suspend the account and notify the user
6. WHEN storing payment information, THE Bharat_Mandi_Platform SHALL comply with PCI-DSS standards and tokenize sensitive card data
7. WHEN accessing user data, THE Bharat_Mandi_Platform SHALL maintain audit logs of all data access events

### Requirement 11: Multi-Language Support

**User Story:** As a farmer who speaks a regional language, I want to use the app in my preferred language, so that I can understand and use all features effectively.

#### Acceptance Criteria

1. WHEN a user first launches the app, THE Bharat_Mandi_Platform SHALL prompt the user to select their preferred language
2. WHEN a language is selected, THE Bharat_Mandi_Platform SHALL display all interface text, labels, and messages in the chosen language
3. WHEN a user changes language preference, THE Bharat_Mandi_Platform SHALL update the interface immediately without requiring app restart
4. THE Bharat_Mandi_Platform SHALL support Hindi, English, and at least 5 major regional languages
5. WHEN displaying produce categories and farming activities, THE Bharat_Mandi_Platform SHALL use localized terminology familiar to farmers
6. WHEN generating Digital_Quality_Certificates, THE Bharat_Mandi_Platform SHALL include text in both English and the farmer's preferred language
7. WHEN sending notifications, THE Bharat_Mandi_Platform SHALL use the user's preferred language

### Requirement 12: Dispute Resolution

**User Story:** As a user, I want a fair process to resolve transaction disputes, so that I am protected from fraud and misunderstandings.

#### Acceptance Criteria

1. WHEN either party reports a dispute, THE Bharat_Mandi_Platform SHALL freeze the escrowed funds and initiate a dispute resolution process
2. WHEN a dispute is initiated, THE Bharat_Mandi_Platform SHALL collect evidence from both parties including photos, messages, and transaction details
3. WHEN evidence is collected, THE Bharat_Mandi_Platform SHALL assign the dispute to a resolution team within 24 hours
4. WHEN reviewing a dispute, THE Bharat_Mandi_Platform SHALL provide both parties access to all submitted evidence
5. WHEN a resolution is reached, THE Bharat_Mandi_Platform SHALL release or refund escrowed funds according to the decision within 48 hours
6. WHEN a dispute is resolved, THE Bharat_Mandi_Platform SHALL update both parties' Credibility_Scores based on the outcome
7. IF a party disagrees with the resolution, THEN THE Bharat_Mandi_Platform SHALL provide an escalation path to senior review

### Requirement 13: Analytics and Insights

**User Story:** As a farmer, I want to see insights about my farming performance and market trends, so that I can make better decisions about what to grow and when to sell.

#### Acceptance Criteria

1. WHEN a farmer views the analytics dashboard, THE Bharat_Mandi_Platform SHALL display total sales, average produce quality, and rating trends
2. WHEN analyzing market data, THE Bharat_Mandi_Platform SHALL show price trends for different produce types in the farmer's region
3. WHEN a farmer plans the next crop, THE Bharat_Mandi_Platform SHALL suggest high-demand produce based on historical market data
4. WHEN displaying insights, THE Bharat_Mandi_Platform SHALL compare the farmer's performance against regional averages
5. WHEN a farmer views Photo_Log analytics, THE Bharat_Mandi_Platform SHALL identify optimal timing patterns for farming activities
6. WHEN generating reports, THE Bharat_Mandi_Platform SHALL allow farmers to export data for external use
7. WHEN market conditions change significantly, THE Bharat_Mandi_Platform SHALL send proactive alerts to farmers about opportunities

### Requirement 14: Kisan-Konnect (Ecosystem Integration)

**User Story:** As a farmer, I want to connect with suppliers, buyers, cold storage, and logistics providers, so that I can manage my entire supply chain from one platform.

#### Acceptance Criteria

1. WHEN a farmer views the Kisan_Konnect directory, THE Bharat_Mandi_Platform SHALL display available suppliers, cold storage facilities, and logistics providers in the farmer's region
2. WHEN a buyer places an order, THE Bharat_Mandi_Platform SHALL allow automatic triggering of a logistics order to transport the produce
3. WHEN a logistics order is created, THE Bharat_Mandi_Platform SHALL notify the selected Logistics_Provider with pickup and delivery details
4. WHEN a farmer needs cold storage, THE Bharat_Mandi_Platform SHALL allow booking of Cold_Storage_Provider facilities with capacity and duration
5. WHEN a farmer searches for suppliers, THE Bharat_Mandi_Platform SHALL filter by input type, location, and supplier ratings
6. WHEN connecting with ecosystem partners, THE Bharat_Mandi_Platform SHALL display partner ratings based on past performance
7. WHEN a logistics order is completed, THE Bharat_Mandi_Platform SHALL update the transaction status and notify all parties
8. WHEN a farmer books cold storage, THE Bharat_Mandi_Platform SHALL integrate storage costs into the transaction pricing

### Requirement 15: Kisan-Mitra (AI Voice Assistant)

**User Story:** As a farmer, I want to ask questions and get help in my own language through voice, so that I can use the platform easily without reading or typing.

#### Acceptance Criteria

1. WHEN a farmer activates Kisan_Mitra, THE Bharat_Mandi_Platform SHALL accept voice input in the farmer's preferred regional language
2. WHEN a farmer asks a question via voice, THE Kisan_Mitra SHALL process the query and respond with relevant information within 3 seconds
3. THE Kisan_Mitra SHALL support queries about produce prices, farming best practices, weather, market trends, and platform features
4. WHERE the farmer uses WhatsApp, THE Kisan_Mitra SHALL accept and respond to voice messages through WhatsApp integration
5. WHERE the farmer calls a helpline number, THE Kisan_Mitra SHALL provide automated voice responses over phone call
6. WHEN Kisan_Mitra cannot answer a query, THE Bharat_Mandi_Platform SHALL escalate to a human support agent
7. WHEN responding to queries, THE Kisan_Mitra SHALL provide concise, actionable answers in the farmer's language
8. WHERE internet connectivity is unavailable, THE Kisan_Mitra SHALL provide cached responses for common queries using offline AI

### Requirement 16: P2P Input Marketplace

**User Story:** As a farmer, I want to sell or exchange surplus agricultural inputs with neighboring farmers, so that I can reduce waste and save costs.

#### Acceptance Criteria

1. WHEN a farmer has surplus inputs, THE P2P_Marketplace SHALL allow listing of seeds, saplings, manure, and other agricultural materials
2. WHEN creating a P2P listing, THE Bharat_Mandi_Platform SHALL require input type, quantity, condition, and asking price or exchange preference
3. WHEN farmers search the P2P_Marketplace, THE Bharat_Mandi_Platform SHALL filter results by input type, location proximity, and price
4. WHEN a farmer views a P2P listing, THE Bharat_Mandi_Platform SHALL display seller rating, location distance, and contact option
5. WHEN farmers agree on an exchange, THE Bharat_Mandi_Platform SHALL facilitate direct communication and coordinate pickup
6. WHEN a P2P transaction is completed, THE Bharat_Mandi_Platform SHALL allow both parties to rate the exchange
7. WHERE farmers prefer barter, THE P2P_Marketplace SHALL support exchange offers without monetary transactions
8. WHEN displaying P2P listings, THE Bharat_Mandi_Platform SHALL prioritize geographically closer farmers to reduce transportation costs

### Requirement 17: Price Prophecy (Market Price Prediction)

**User Story:** As a farmer, I want to see predicted market prices for the next 7 days, so that I can avoid panic selling and choose the optimal time to sell.

#### Acceptance Criteria

1. WHEN a farmer views price predictions, THE Price_Prophecy_Module SHALL display forecasted prices for the next 7 days for selected produce types
2. WHEN generating predictions, THE Price_Prophecy_Module SHALL analyze historical price data, seasonal trends, and current market conditions
3. WHEN displaying predictions, THE Bharat_Mandi_Platform SHALL show confidence intervals and prediction accuracy metrics
4. WHEN market conditions change significantly, THE Price_Prophecy_Module SHALL update predictions and notify affected farmers
5. WHEN a farmer selects a produce type, THE Price_Prophecy_Module SHALL show price trends for the past 30 days alongside future predictions
6. WHEN predictions indicate favorable selling conditions, THE Bharat_Mandi_Platform SHALL send proactive alerts to farmers with ready produce
7. WHEN predictions indicate price drops, THE Bharat_Mandi_Platform SHALL suggest alternative selling strategies or storage options
8. WHEN displaying predictions, THE Bharat_Mandi_Platform SHALL compare predicted prices across different markets and regions

### Requirement 18: Rating and Feedback System

**User Story:** As a user, I want to see reliable ratings for farmers and buyers, so that I can make informed decisions about who to transact with.

#### Acceptance Criteria

1. WHEN a transaction is completed, THE Rating_System SHALL automatically calculate implicit ratings based on payment speed, rejection rates, and grading accuracy
2. WHEN calculating farmer ratings, THE Rating_System SHALL consider delivery timeliness, produce quality consistency, and communication responsiveness
3. WHEN calculating buyer ratings, THE Rating_System SHALL consider payment promptness, fair dispute behavior, and order completion rate
4. WHEN a transaction is completed, THE Bharat_Mandi_Platform SHALL prompt both parties to provide optional verbose feedback
5. WHEN a user views another user's profile, THE Bharat_Mandi_Platform SHALL display the overall rating score and breakdown of rating factors
6. WHEN displaying ratings, THE Bharat_Mandi_Platform SHALL show both the AI-calculated implicit rating and aggregated user feedback
7. WHEN a user receives negative feedback, THE Bharat_Mandi_Platform SHALL allow the user to respond with their perspective
8. WHEN rating scores change significantly, THE Bharat_Mandi_Platform SHALL notify the affected user with explanation of contributing factors
9. WHEN a new user joins, THE Rating_System SHALL initialize their rating at a neutral baseline value
