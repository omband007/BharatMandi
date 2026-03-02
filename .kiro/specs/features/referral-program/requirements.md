# Requirements Document: Referral Program

## Introduction

The Referral Program incentivizes users to invite friends and family to Bharat Mandi through unique referral codes and rewards. Users earn points and benefits when their referrals register and complete activities. This system drives organic growth, reduces customer acquisition costs, and builds a stronger community.

## Glossary

- **Referral_Manager**: The system component managing referral codes and rewards
- **Referrer**: The user who shares a referral code
- **Referee**: The new user who registers using a referral code
- **Referral_Code**: A unique alphanumeric code assigned to each user
- **Referral_Link**: A shareable URL containing the referral code
- **Referral_Reward**: Points or benefits earned for successful referrals
- **Referral_Milestone**: A threshold that triggers bonus rewards (e.g., 10 referrals)
- **Referral_Status**: The state of a referral (pending, registered, active, completed)
- **Referral_Conversion**: When a referee completes their first transaction
- **Referral_Chain**: Multi-level referral tracking (referrer → referee → sub-referee)
- **Referral_Campaign**: Time-limited promotional referral events

## Requirements

### Requirement 1: Referral Code Generation

**User Story:** As a user, I want to have a unique referral code, so that I can invite others to the platform.

#### Acceptance Criteria

1. THE Referral_Manager SHALL generate a unique referral code for each user upon registration
2. THE Referral_Manager SHALL create codes with 6-8 alphanumeric characters
3. THE Referral_Manager SHALL ensure codes are easy to read (exclude ambiguous characters like 0/O, 1/I)
4. THE Referral_Manager SHALL verify code uniqueness before assignment
5. THE Referral_Manager SHALL allow users to customize their referral code (if available)
6. THE Referral_Manager SHALL store referral codes permanently (never change)
7. THE Referral_Manager SHALL display the referral code prominently in the user profile

### Requirement 2: Referral Link Generation

**User Story:** As a user, I want to share a referral link, so that my friends can easily register.

#### Acceptance Criteria

1. THE Referral_Manager SHALL generate a referral link containing the user's referral code
2. THE Referral_Manager SHALL format links as: `https://bharatmandi.app/register?ref=CODE`
3. THE Referral_Manager SHALL provide a "Copy Link" button for easy sharing
4. THE Referral_Manager SHALL provide share buttons for WhatsApp, SMS, and social media
5. THE Referral_Manager SHALL track which sharing method is used
6. THE Referral_Manager SHALL generate QR codes for referral links
7. THE Referral_Manager SHALL allow users to share via email with a pre-filled message

### Requirement 3: Referral Code Entry During Registration

**User Story:** As a new user, I want to enter a referral code during registration, so that I can benefit from the referral.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide an optional referral code field during registration
2. THE Referral_Manager SHALL validate referral codes in real-time
3. THE Referral_Manager SHALL display the referrer's name when a valid code is entered
4. THE Referral_Manager SHALL allow users to skip referral code entry
5. THE Referral_Manager SHALL prevent users from entering their own referral code
6. THE Referral_Manager SHALL prevent users from entering invalid or expired codes
7. THE Referral_Manager SHALL link the referee to the referrer upon successful registration

### Requirement 4: Referral Link Auto-Application

**User Story:** As a new user clicking a referral link, I want the code to be automatically applied, so that I don't have to enter it manually.

#### Acceptance Criteria

1. THE Referral_Manager SHALL extract referral codes from URL parameters
2. THE Referral_Manager SHALL auto-fill the referral code field during registration
3. THE Referral_Manager SHALL validate the code before auto-filling
4. THE Referral_Manager SHALL display a message indicating the referral code is applied
5. THE Referral_Manager SHALL allow users to remove or change the auto-filled code
6. THE Referral_Manager SHALL store the referral code in session storage for multi-step registration

### Requirement 5: Registration Reward

**User Story:** As a referrer, I want to earn points when someone registers with my code, so that I'm rewarded for inviting them.

#### Acceptance Criteria

1. THE Referral_Manager SHALL award 100 points to the referrer when a referee completes registration
2. THE Referral_Manager SHALL award points only after the referee verifies their mobile number
3. THE Referral_Manager SHALL send a notification to the referrer when points are awarded
4. THE Referral_Manager SHALL display the referee's name (first name only) in the notification
5. THE Referral_Manager SHALL update the referrer's referral count
6. THE Referral_Manager SHALL log all registration rewards with timestamps

### Requirement 6: Welcome Bonus for Referee

**User Story:** As a new user who used a referral code, I want to receive a welcome bonus, so that I'm incentivized to join.

#### Acceptance Criteria

1. THE Referral_Manager SHALL award 50 points to the referee upon successful registration
2. THE Referral_Manager SHALL display a welcome message with the bonus amount
3. THE Referral_Manager SHALL explain how to earn more points
4. THE Referral_Manager SHALL send a notification about the welcome bonus
5. THE Referral_Manager SHALL add the bonus to both current and lifetime points

### Requirement 7: First Transaction Reward

**User Story:** As a referrer, I want to earn bonus points when my referral completes their first transaction, so that I'm rewarded for quality referrals.

#### Acceptance Criteria

1. THE Referral_Manager SHALL award 200 points to the referrer when the referee completes their first transaction
2. THE Referral_Manager SHALL award points for both buying and selling transactions
3. THE Referral_Manager SHALL award points only for successful transactions (not cancelled)
4. THE Referral_Manager SHALL send a notification to the referrer when the bonus is awarded
5. THE Referral_Manager SHALL mark the referral as "converted" after first transaction
6. THE Referral_Manager SHALL log all transaction rewards with timestamps

### Requirement 8: Referral Dashboard

**User Story:** As a user, I want to see my referral statistics, so that I can track my invitations and rewards.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide a referral dashboard in the user profile
2. THE Referral_Manager SHALL display total number of referrals
3. THE Referral_Manager SHALL display number of registered referrals
4. THE Referral_Manager SHALL display number of active referrals (completed first transaction)
5. THE Referral_Manager SHALL display total points earned from referrals
6. THE Referral_Manager SHALL display referral conversion rate (active / registered)
7. THE Referral_Manager SHALL display a list of recent referrals with status
8. THE Referral_Manager SHALL display referral code and sharing options prominently

### Requirement 9: Referral History

**User Story:** As a user, I want to see my referral history, so that I can track who I've invited and their status.

#### Acceptance Criteria

1. THE Referral_Manager SHALL maintain a complete referral history for each user
2. THE Referral_Manager SHALL display referee name (first name only) or anonymized ID
3. THE Referral_Manager SHALL display registration date for each referral
4. THE Referral_Manager SHALL display current status (pending, registered, active)
5. THE Referral_Manager SHALL display points earned from each referral
6. THE Referral_Manager SHALL allow filtering by status
7. THE Referral_Manager SHALL allow sorting by date or points earned
8. THE Referral_Manager SHALL display total count and pagination for large lists

### Requirement 10: Referral Milestones

**User Story:** As a user, I want to earn bonus rewards for reaching referral milestones, so that I'm motivated to invite more people.

#### Acceptance Criteria

1. THE Referral_Manager SHALL award 500 bonus points for 5 successful referrals
2. THE Referral_Manager SHALL award 1500 bonus points for 10 successful referrals
3. THE Referral_Manager SHALL award 3000 bonus points for 25 successful referrals
4. THE Referral_Manager SHALL award 7500 bonus points for 50 successful referrals
5. THE Referral_Manager SHALL award 15000 bonus points for 100 successful referrals
6. THE Referral_Manager SHALL define "successful" as referrals who completed first transaction
7. THE Referral_Manager SHALL send congratulatory notifications when milestones are reached
8. THE Referral_Manager SHALL display milestone progress in the referral dashboard
9. THE Referral_Manager SHALL display next milestone and points needed

### Requirement 11: Referral Leaderboard

**User Story:** As a user, I want to see top referrers, so that I'm motivated to compete and invite more people.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide a referral leaderboard
2. THE Referral_Manager SHALL display top 100 users by successful referrals
3. THE Referral_Manager SHALL update the leaderboard daily
4. THE Referral_Manager SHALL show the user's current rank
5. THE Referral_Manager SHALL display username, referral count, and tier for each entry
6. THE Referral_Manager SHALL allow users to opt out of leaderboard display
7. THE Referral_Manager SHALL provide separate leaderboards for different time periods (monthly, all-time)
8. THE Referral_Manager SHALL highlight top 3 referrers with special badges

### Requirement 12: Referral Limits

**User Story:** As a platform operator, I want to limit referrals per user, so that we prevent abuse.

#### Acceptance Criteria

1. THE Referral_Manager SHALL limit referrals to 50 per user per month
2. THE Referral_Manager SHALL display remaining referral slots in the dashboard
3. THE Referral_Manager SHALL reset the limit on the first day of each month
4. THE Referral_Manager SHALL allow Gold and Platinum members unlimited referrals
5. THE Referral_Manager SHALL send a notification when the limit is reached
6. THE Referral_Manager SHALL allow users to request limit increases for special cases
7. THE Referral_Manager SHALL log all referral attempts including those that hit the limit

### Requirement 13: Referral Fraud Prevention

**User Story:** As a platform operator, I want to prevent referral fraud, so that the program remains fair.

#### Acceptance Criteria

1. THE Referral_Manager SHALL prevent self-referrals (same device, IP, or phone number)
2. THE Referral_Manager SHALL detect and flag suspicious referral patterns
3. THE Referral_Manager SHALL require referee to complete profile before awarding referrer points
4. THE Referral_Manager SHALL require referee to be active for 7 days before first transaction reward
5. THE Referral_Manager SHALL flag referrals from the same IP address
6. THE Referral_Manager SHALL flag referrals with similar device fingerprints
7. THE Referral_Manager SHALL review flagged referrals manually before awarding points
8. THE Referral_Manager SHALL penalize users found to be gaming the system
9. THE Referral_Manager SHALL revoke fraudulent referral rewards

### Requirement 14: Referral Campaigns

**User Story:** As a platform operator, I want to run referral campaigns, so that we can boost growth during specific periods.

#### Acceptance Criteria

1. THE Referral_Manager SHALL support time-limited referral campaigns
2. THE Referral_Manager SHALL allow setting campaign duration (start and end dates)
3. THE Referral_Manager SHALL allow setting bonus multipliers for campaigns (e.g., 2x points)
4. THE Referral_Manager SHALL allow setting special rewards for campaigns
5. THE Referral_Manager SHALL display active campaigns prominently in the app
6. THE Referral_Manager SHALL automatically apply campaign bonuses to eligible referrals
7. THE Referral_Manager SHALL track campaign performance (referrals, conversions, ROI)
8. THE Referral_Manager SHALL send notifications when campaigns start and end

### Requirement 15: Referral Sharing Templates

**User Story:** As a user, I want pre-written messages for sharing, so that I can easily invite friends.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide message templates for different sharing channels
2. THE Referral_Manager SHALL customize templates with the user's name and referral code
3. THE Referral_Manager SHALL provide templates in multiple languages
4. THE Referral_Manager SHALL allow users to edit templates before sharing
5. THE Referral_Manager SHALL provide templates for WhatsApp, SMS, email, and social media
6. THE Referral_Manager SHALL include benefits for both referrer and referee in templates
7. THE Referral_Manager SHALL keep templates concise and compelling

### Requirement 16: Referral Notifications

**User Story:** As a user, I want to receive notifications about my referrals, so that I stay informed.

#### Acceptance Criteria

1. THE Referral_Manager SHALL send notifications when someone uses the user's referral code
2. THE Referral_Manager SHALL send notifications when a referral completes registration
3. THE Referral_Manager SHALL send notifications when a referral completes first transaction
4. THE Referral_Manager SHALL send notifications when referral milestones are reached
5. THE Referral_Manager SHALL send notifications when referral rewards are earned
6. THE Referral_Manager SHALL allow users to configure referral notification preferences
7. THE Referral_Manager SHALL batch notifications to avoid overwhelming users

### Requirement 17: Referral Attribution

**User Story:** As a platform operator, I want to track referral attribution, so that we understand growth sources.

#### Acceptance Criteria

1. THE Referral_Manager SHALL track which sharing channel was used for each referral
2. THE Referral_Manager SHALL track referral source (organic, campaign, etc.)
3. THE Referral_Manager SHALL track time from referral link click to registration
4. THE Referral_Manager SHALL track time from registration to first transaction
5. THE Referral_Manager SHALL calculate referral conversion rates by channel
6. THE Referral_Manager SHALL calculate referral ROI (rewards paid vs. user lifetime value)
7. THE Referral_Manager SHALL provide analytics dashboard for referral attribution

### Requirement 18: Multi-Level Referrals (Optional)

**User Story:** As a user, I want to earn from my referrals' referrals, so that I benefit from network growth.

#### Acceptance Criteria

1. THE Referral_Manager SHALL support 2-level referral tracking (optional feature)
2. THE Referral_Manager SHALL award 50 points when a referee's referral registers
3. THE Referral_Manager SHALL award 100 points when a referee's referral completes first transaction
4. THE Referral_Manager SHALL display referral chain in the dashboard
5. THE Referral_Manager SHALL limit multi-level rewards to 2 levels deep
6. THE Referral_Manager SHALL clearly communicate multi-level benefits to users
7. THE Referral_Manager SHALL allow platform operators to enable/disable multi-level referrals

### Requirement 19: Referral Expiration

**User Story:** As a platform operator, I want referral links to expire, so that we maintain data hygiene.

#### Acceptance Criteria

1. THE Referral_Manager SHALL set referral link expiration to 90 days (configurable)
2. THE Referral_Manager SHALL allow users to regenerate expired links
3. THE Referral_Manager SHALL track link generation and expiration dates
4. THE Referral_Manager SHALL display link expiration date in the dashboard
5. THE Referral_Manager SHALL send reminders before links expire
6. THE Referral_Manager SHALL allow permanent links for high-tier members

### Requirement 20: Referral Analytics

**User Story:** As a product manager, I want to analyze referral data, so that I can optimize the program.

#### Acceptance Criteria

1. THE Referral_Manager SHALL track total referrals across all users
2. THE Referral_Manager SHALL track referral conversion rates (registered / invited)
3. THE Referral_Manager SHALL track transaction conversion rates (active / registered)
4. THE Referral_Manager SHALL track average time to first transaction for referrals
5. THE Referral_Manager SHALL track referral rewards paid out
6. THE Referral_Manager SHALL track referral program ROI
7. THE Referral_Manager SHALL track top referrers and their characteristics
8. THE Referral_Manager SHALL track referral sources and channels
9. THE Referral_Manager SHALL provide analytics dashboard for referral metrics
10. THE Referral_Manager SHALL generate monthly referral program reports

### Requirement 21: Referral Code Customization

**User Story:** As a user, I want to customize my referral code, so that it's memorable and personal.

#### Acceptance Criteria

1. THE Referral_Manager SHALL allow users to request custom referral codes
2. THE Referral_Manager SHALL validate custom codes for availability
3. THE Referral_Manager SHALL require custom codes to be 6-12 characters
4. THE Referral_Manager SHALL allow only alphanumeric characters in custom codes
5. THE Referral_Manager SHALL prevent offensive or inappropriate custom codes
6. THE Referral_Manager SHALL charge points or require tier level for custom codes (optional)
7. THE Referral_Manager SHALL allow one custom code change per user

### Requirement 22: Referral Rewards Redemption

**User Story:** As a user, I want to redeem my referral rewards, so that I can use them for benefits.

#### Acceptance Criteria

1. THE Referral_Manager SHALL add referral rewards to the user's points balance
2. THE Referral_Manager SHALL allow users to redeem points through the gamification system
3. THE Referral_Manager SHALL track points earned specifically from referrals
4. THE Referral_Manager SHALL display referral points separately in the dashboard
5. THE Referral_Manager SHALL allow users to see total value earned from referrals

### Requirement 23: Referral Program Terms

**User Story:** As a user, I want to understand referral program terms, so that I know the rules.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide a terms and conditions page for the referral program
2. THE Referral_Manager SHALL explain eligibility requirements
3. THE Referral_Manager SHALL explain reward amounts and conditions
4. THE Referral_Manager SHALL explain fraud prevention measures
5. THE Referral_Manager SHALL explain referral limits and restrictions
6. THE Referral_Manager SHALL explain how to report issues
7. THE Referral_Manager SHALL require users to accept terms before participating

### Requirement 24: Referral Support

**User Story:** As a user, I want help with referrals, so that I can maximize my rewards.

#### Acceptance Criteria

1. THE Referral_Manager SHALL provide a referral FAQ section
2. THE Referral_Manager SHALL provide tips for successful referrals
3. THE Referral_Manager SHALL provide troubleshooting guides
4. THE Referral_Manager SHALL allow users to contact support about referral issues
5. THE Referral_Manager SHALL track common referral questions for improvement
6. THE Referral_Manager SHALL provide video tutorials on how to refer

### Requirement 25: Referral Badges

**User Story:** As a top referrer, I want to earn special badges, so that my contribution is recognized.

#### Acceptance Criteria

1. THE Referral_Manager SHALL award a "Referral Champion" badge for 50+ successful referrals
2. THE Referral_Manager SHALL award a "Community Builder" badge for 100+ successful referrals
3. THE Referral_Manager SHALL award a "Growth Leader" badge for top 10 referrers
4. THE Referral_Manager SHALL display referral badges on user profiles
5. THE Referral_Manager SHALL display referral badges in marketplace listings
6. THE Referral_Manager SHALL send congratulatory notifications when badges are earned
7. THE Referral_Manager SHALL provide special perks for badge holders (e.g., unlimited referrals)
