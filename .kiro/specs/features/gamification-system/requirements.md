# Requirements Document: Gamification System

## Introduction

The Gamification System adds engagement mechanics to Bharat Mandi through points, membership tiers, achievements, and rewards. Users earn points through platform activities, progress through membership tiers, and redeem points for benefits. This system increases user engagement, retention, and platform loyalty.

## Glossary

- **Gamification_Manager**: The system component managing points, tiers, and rewards
- **Points**: Virtual currency earned through platform activities
- **Lifetime_Points**: Total points earned by a user (never decreases)
- **Current_Points**: Spendable points balance (decreases when redeemed)
- **Membership_Tier**: User rank based on lifetime points (Bronze, Silver, Gold, Platinum)
- **Activity**: A user action that earns points (listing, transaction, login, etc.)
- **Daily_Streak**: Consecutive days of platform usage
- **Reward**: A benefit that can be purchased with points
- **Points_Cap**: Maximum points earnable per day from regular activities
- **Achievement**: A milestone or accomplishment that earns bonus points
- **Leaderboard**: Ranking of users by points or other metrics

## Requirements

### Requirement 1: Points System Foundation

**User Story:** As a user, I want to earn points for my activities, so that I feel rewarded for engagement.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL maintain two point balances for each user: current and lifetime
2. THE Gamification_Manager SHALL initialize new users with 0 points
3. THE Gamification_Manager SHALL update points balances in real-time
4. THE Gamification_Manager SHALL store the timestamp of the last points update
5. THE Gamification_Manager SHALL maintain a points history log for each user
6. THE Gamification_Manager SHALL display current points balance prominently in the user profile
7. THE Gamification_Manager SHALL never decrease lifetime points
8. THE Gamification_Manager SHALL decrease current points only when redeemed for rewards

### Requirement 2: Points Earning - Profile Activities

**User Story:** As a user, I want to earn points for completing my profile, so that I'm motivated to provide complete information.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL award 50 points when profile completeness reaches 100%
2. THE Gamification_Manager SHALL award 10 points when a user uploads a profile picture
3. THE Gamification_Manager SHALL award 5 points when a user adds their location
4. THE Gamification_Manager SHALL award 5 points when a user adds their user type
5. THE Gamification_Manager SHALL award 5 points when a user adds at least one crop
6. THE Gamification_Manager SHALL award points only once per profile field completion
7. THE Gamification_Manager SHALL not award duplicate points for the same field

### Requirement 3: Points Earning - Marketplace Activities

**User Story:** As a user, I want to earn points for marketplace activities, so that I'm rewarded for active participation.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL award 10 points when a user creates a new marketplace listing
2. THE Gamification_Manager SHALL award 20 points when a user completes a successful transaction as seller
3. THE Gamification_Manager SHALL award 15 points when a user completes a successful transaction as buyer
4. THE Gamification_Manager SHALL award 5 points when a user uploads a crop photo for grading
5. THE Gamification_Manager SHALL award 3 points when a user updates a listing
6. THE Gamification_Manager SHALL limit listing creation points to 3 listings per day
7. THE Gamification_Manager SHALL not award points for cancelled or failed transactions

### Requirement 4: Points Earning - Information Activities

**User Story:** As a user, I want to earn points for using information services, so that I'm encouraged to engage with platform features.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL award 5 points when a user checks weather information
2. THE Gamification_Manager SHALL award 5 points when a user queries crop prices
3. THE Gamification_Manager SHALL award 5 points when a user requests farming advice
4. THE Gamification_Manager SHALL award 3 points when a user uses the voice interface
5. THE Gamification_Manager SHALL limit information activity points to once per activity type per day
6. THE Gamification_Manager SHALL reset daily limits at midnight local time

### Requirement 5: Daily Streak System

**User Story:** As a user, I want to earn bonus points for consecutive daily usage, so that I'm motivated to return regularly.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL track consecutive days of platform usage
2. THE Gamification_Manager SHALL award 10 points for each day of consecutive usage
3. THE Gamification_Manager SHALL increase streak bonus by 2 points per day (day 1: 10pts, day 2: 12pts, day 3: 14pts)
4. THE Gamification_Manager SHALL cap daily streak bonus at 30 points (day 11+)
5. THE Gamification_Manager SHALL reset streak to 0 if a user misses a day
6. THE Gamification_Manager SHALL display current streak count in the user profile
7. THE Gamification_Manager SHALL send a notification when a user reaches streak milestones (7, 30, 100 days)
8. THE Gamification_Manager SHALL consider a day as "active" if the user performs any activity

### Requirement 6: Daily Points Cap

**User Story:** As a platform operator, I want to limit daily points earning, so that we prevent point farming and maintain system balance.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL set a daily points cap of 200 points from regular activities
2. THE Gamification_Manager SHALL exclude transaction points from the daily cap
3. THE Gamification_Manager SHALL exclude profile completion points from the daily cap
4. THE Gamification_Manager SHALL exclude streak bonus from the daily cap
5. THE Gamification_Manager SHALL reset the daily cap at midnight local time
6. WHEN the daily cap is reached, THE Gamification_Manager SHALL display a message to the user
7. THE Gamification_Manager SHALL still allow users to perform activities after reaching the cap

### Requirement 7: Membership Tier System

**User Story:** As a user, I want to progress through membership tiers, so that I gain recognition and unlock benefits.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL define four membership tiers: Bronze, Silver, Gold, Platinum
2. THE Gamification_Manager SHALL set Bronze as the default tier for new users
3. THE Gamification_Manager SHALL promote users to Silver at 500 lifetime points
4. THE Gamification_Manager SHALL promote users to Gold at 2000 lifetime points
5. THE Gamification_Manager SHALL promote users to Platinum at 5000 lifetime points
6. THE Gamification_Manager SHALL base tier progression on lifetime points (not current balance)
7. THE Gamification_Manager SHALL never demote users to lower tiers
8. THE Gamification_Manager SHALL display tier badge in the user profile
9. THE Gamification_Manager SHALL display tier badge next to username in marketplace listings
10. THE Gamification_Manager SHALL send a congratulatory notification when a user reaches a new tier

### Requirement 8: Tier Benefits - Silver

**User Story:** As a Silver member, I want to receive benefits for my tier, so that I feel valued for my engagement.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide Silver members with a silver badge icon
2. THE Gamification_Manager SHALL give Silver members priority in search results (10% boost)
3. THE Gamification_Manager SHALL allow Silver members to create up to 10 active listings (vs 5 for Bronze)
4. THE Gamification_Manager SHALL display "Silver Member" label on Silver users' listings
5. THE Gamification_Manager SHALL provide Silver members with basic analytics on their listings

### Requirement 9: Tier Benefits - Gold

**User Story:** As a Gold member, I want to receive enhanced benefits, so that I'm motivated to maintain high engagement.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide Gold members with a gold badge icon
2. THE Gamification_Manager SHALL give Gold members priority customer support (24-hour response time)
3. THE Gamification_Manager SHALL reduce transaction fees by 25% for Gold members
4. THE Gamification_Manager SHALL allow Gold members to create up to 20 active listings
5. THE Gamification_Manager SHALL give Gold members priority in search results (25% boost)
6. THE Gamification_Manager SHALL provide Gold members with advanced analytics and insights
7. THE Gamification_Manager SHALL allow Gold members to feature one listing per week for free

### Requirement 10: Tier Benefits - Platinum

**User Story:** As a Platinum member, I want to receive premium benefits, so that I'm recognized as a top contributor.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide Platinum members with a platinum badge icon
2. THE Gamification_Manager SHALL give Platinum members priority customer support (12-hour response time)
3. THE Gamification_Manager SHALL reduce transaction fees by 50% for Platinum members
4. THE Gamification_Manager SHALL allow Platinum members unlimited active listings
5. THE Gamification_Manager SHALL give Platinum members top priority in search results (50% boost)
6. THE Gamification_Manager SHALL provide Platinum members with premium analytics and market insights
7. THE Gamification_Manager SHALL allow Platinum members to feature three listings per week for free
8. THE Gamification_Manager SHALL give Platinum members early access to new features
9. THE Gamification_Manager SHALL display "Platinum Member" badge prominently on all Platinum users' content

### Requirement 11: Points Redemption Catalog

**User Story:** As a user, I want to see what I can redeem my points for, so that I understand the value of earning points.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide a points redemption catalog
2. THE Gamification_Manager SHALL display all available rewards with point costs
3. THE Gamification_Manager SHALL show the user's current points balance in the catalog
4. THE Gamification_Manager SHALL indicate which rewards the user can afford
5. THE Gamification_Manager SHALL display reward descriptions and benefits
6. THE Gamification_Manager SHALL update the catalog in real-time as points are earned or spent
7. THE Gamification_Manager SHALL categorize rewards (listing boosts, fee waivers, support, etc.)

### Requirement 12: Points Redemption - Listing Boosts

**User Story:** As a user, I want to redeem points for listing visibility, so that my products get more attention.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL allow redemption of 500 points for a featured listing (24 hours)
2. THE Gamification_Manager SHALL allow redemption of 1000 points for a premium listing (7 days)
3. THE Gamification_Manager SHALL allow redemption of 300 points for a listing refresh (moves to top)
4. WHEN points are redeemed, THE Gamification_Manager SHALL deduct from current points balance
5. WHEN points are redeemed, THE Gamification_Manager SHALL activate the benefit within 1 minute
6. THE Gamification_Manager SHALL display featured/premium badges on boosted listings
7. THE Gamification_Manager SHALL track redemption history for each user

### Requirement 13: Points Redemption - Fee Waivers

**User Story:** As a user, I want to redeem points for transaction fee waivers, so that I save money on transactions.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL allow redemption of 2000 points for one transaction fee waiver
2. THE Gamification_Manager SHALL allow redemption of 5000 points for three transaction fee waivers
3. WHEN a fee waiver is redeemed, THE Gamification_Manager SHALL add it to the user's account
4. THE Gamification_Manager SHALL automatically apply fee waivers to the next eligible transaction
5. THE Gamification_Manager SHALL display remaining fee waivers in the user profile
6. THE Gamification_Manager SHALL set fee waivers to expire after 90 days if unused
7. THE Gamification_Manager SHALL notify users before fee waivers expire

### Requirement 14: Points Redemption - Support Access

**User Story:** As a user, I want to redeem points for priority support, so that I get faster help when needed.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL allow redemption of 3000 points for priority support (30 days)
2. WHEN priority support is redeemed, THE Gamification_Manager SHALL flag the user's account
3. THE Gamification_Manager SHALL display priority support status in the user profile
4. THE Gamification_Manager SHALL notify the support team of priority support users
5. THE Gamification_Manager SHALL automatically expire priority support after 30 days
6. THE Gamification_Manager SHALL allow users to extend priority support by redeeming again

### Requirement 15: Redemption Confirmation

**User Story:** As a user, I want to confirm before redeeming points, so that I don't accidentally spend points.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL display a confirmation dialog before any redemption
2. THE Gamification_Manager SHALL show the point cost and benefit details in the confirmation
3. THE Gamification_Manager SHALL show the user's remaining balance after redemption
4. THE Gamification_Manager SHALL allow users to cancel the redemption
5. WHEN redemption is confirmed, THE Gamification_Manager SHALL process it immediately
6. THE Gamification_Manager SHALL send a confirmation notification after successful redemption
7. THE Gamification_Manager SHALL prevent redemption if the user has insufficient points

### Requirement 16: Redemption History

**User Story:** As a user, I want to see my redemption history, so that I can track how I've used my points.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL maintain a redemption history for each user
2. THE Gamification_Manager SHALL display all past redemptions with dates and point costs
3. THE Gamification_Manager SHALL show the benefit received for each redemption
4. THE Gamification_Manager SHALL display the user's points balance at the time of redemption
5. THE Gamification_Manager SHALL allow users to filter redemption history by date or type
6. THE Gamification_Manager SHALL allow users to export redemption history as CSV

### Requirement 17: Achievements System

**User Story:** As a user, I want to unlock achievements, so that I have goals to work toward and feel accomplished.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL define achievements for various milestones
2. THE Gamification_Manager SHALL award "First Listing" achievement (50 bonus points)
3. THE Gamification_Manager SHALL award "First Transaction" achievement (100 bonus points)
4. THE Gamification_Manager SHALL award "Week Warrior" achievement for 7-day streak (200 bonus points)
5. THE Gamification_Manager SHALL award "Month Master" achievement for 30-day streak (1000 bonus points)
6. THE Gamification_Manager SHALL award "Profile Perfectionist" achievement for 100% profile (100 bonus points)
7. THE Gamification_Manager SHALL display unlocked achievements in the user profile
8. THE Gamification_Manager SHALL send a notification when an achievement is unlocked
9. THE Gamification_Manager SHALL display achievement badges on the user's public profile

### Requirement 18: Leaderboard

**User Story:** As a user, I want to see how I rank against others, so that I'm motivated to earn more points.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide a points leaderboard
2. THE Gamification_Manager SHALL display top 100 users by lifetime points
3. THE Gamification_Manager SHALL update the leaderboard daily
4. THE Gamification_Manager SHALL show the user's current rank
5. THE Gamification_Manager SHALL display username, tier, and points for each leaderboard entry
6. THE Gamification_Manager SHALL allow users to opt out of leaderboard display
7. THE Gamification_Manager SHALL provide separate leaderboards for different time periods (weekly, monthly, all-time)

### Requirement 19: Gamification Dashboard

**User Story:** As a user, I want to see all my gamification metrics in one place, so that I understand my progress.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL provide a unified gamification dashboard
2. THE Gamification_Manager SHALL display current points balance prominently
3. THE Gamification_Manager SHALL display lifetime points earned
4. THE Gamification_Manager SHALL display current membership tier with progress to next tier
5. THE Gamification_Manager SHALL display current daily streak
6. THE Gamification_Manager SHALL display unlocked achievements
7. THE Gamification_Manager SHALL display recent points-earning activities
8. THE Gamification_Manager SHALL display available rewards
9. THE Gamification_Manager SHALL display leaderboard rank
10. THE Gamification_Manager SHALL provide quick actions for earning more points

### Requirement 20: Points Expiration

**User Story:** As a platform operator, I want points to expire after inactivity, so that we maintain an active user base.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL set points expiration to 365 days of inactivity
2. THE Gamification_Manager SHALL send a warning notification 30 days before expiration
3. THE Gamification_Manager SHALL send a final warning 7 days before expiration
4. WHEN points expire, THE Gamification_Manager SHALL deduct from current points only (not lifetime)
5. THE Gamification_Manager SHALL reset the expiration timer when the user earns new points
6. THE Gamification_Manager SHALL not expire points for Gold and Platinum members
7. THE Gamification_Manager SHALL log all points expiration events

### Requirement 21: Gamification Analytics

**User Story:** As a product manager, I want to track gamification metrics, so that I can optimize the system.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL track total points awarded across all users
2. THE Gamification_Manager SHALL track points awarded by activity type
3. THE Gamification_Manager SHALL track average points per user
4. THE Gamification_Manager SHALL track distribution of users across membership tiers
5. THE Gamification_Manager SHALL track points redemption rates by reward type
6. THE Gamification_Manager SHALL track correlation between points and user retention
7. THE Gamification_Manager SHALL track achievement unlock rates
8. THE Gamification_Manager SHALL track daily active users with streaks
9. THE Gamification_Manager SHALL provide analytics dashboard for gamification metrics
10. THE Gamification_Manager SHALL identify top point earners for recognition

### Requirement 22: Bonus Points Events

**User Story:** As a platform operator, I want to run bonus points events, so that we can boost engagement during specific periods.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL support temporary bonus points multipliers
2. THE Gamification_Manager SHALL allow setting multipliers for specific activities (e.g., 2x points for listings)
3. THE Gamification_Manager SHALL allow setting event duration (start and end dates)
4. THE Gamification_Manager SHALL display active bonus events prominently in the app
5. THE Gamification_Manager SHALL automatically apply bonus multipliers during events
6. THE Gamification_Manager SHALL track points earned during bonus events separately
7. THE Gamification_Manager SHALL send notifications when bonus events start and end

### Requirement 23: Points Gifting

**User Story:** As a user, I want to gift points to other users, so that I can help friends or reward good service.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL allow users to gift points to other users
2. THE Gamification_Manager SHALL require a minimum gift amount of 100 points
3. THE Gamification_Manager SHALL limit gifts to 1000 points per transaction
4. THE Gamification_Manager SHALL deduct gifted points from the sender's current balance
5. THE Gamification_Manager SHALL add gifted points to the recipient's current and lifetime balances
6. THE Gamification_Manager SHALL send notifications to both sender and recipient
7. THE Gamification_Manager SHALL log all point gifting transactions
8. THE Gamification_Manager SHALL prevent point gifting abuse by limiting to 3 gifts per day

### Requirement 24: Tier Progress Visualization

**User Story:** As a user, I want to see my progress toward the next tier, so that I know how many more points I need.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL display a progress bar showing tier advancement
2. THE Gamification_Manager SHALL show lifetime points needed for the next tier
3. THE Gamification_Manager SHALL show current lifetime points
4. THE Gamification_Manager SHALL calculate and display points remaining to next tier
5. THE Gamification_Manager SHALL display estimated time to next tier based on recent activity
6. THE Gamification_Manager SHALL show benefits that will be unlocked at the next tier
7. THE Gamification_Manager SHALL update progress in real-time as points are earned

### Requirement 25: Gamification Notifications

**User Story:** As a user, I want to receive notifications about my gamification progress, so that I stay engaged.

#### Acceptance Criteria

1. THE Gamification_Manager SHALL send notifications when points are earned
2. THE Gamification_Manager SHALL send notifications when a new tier is reached
3. THE Gamification_Manager SHALL send notifications when achievements are unlocked
4. THE Gamification_Manager SHALL send notifications when daily streak milestones are reached
5. THE Gamification_Manager SHALL send notifications when points are about to expire
6. THE Gamification_Manager SHALL send notifications when rewards are redeemed
7. THE Gamification_Manager SHALL allow users to configure notification preferences
8. THE Gamification_Manager SHALL batch notifications to avoid overwhelming users
