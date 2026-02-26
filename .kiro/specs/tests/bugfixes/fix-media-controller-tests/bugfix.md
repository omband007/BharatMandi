# Bugfix Requirements Document: Media Controller Integration Tests

## Introduction

The media controller integration tests are failing because all API endpoints return 500 Internal Server Error instead of the expected status codes (201, 200, 404, 403, 400). The test suite creates a basic Express app with the media controller but does not properly mock the underlying services (MediaService, StorageService, ValidationService) that the controller depends on. When the controller attempts to call these unmocked services, it results in runtime errors that manifest as 500 responses.

This affects 14 tests across all media controller endpoints:
- POST /api/marketplace/listings/:listingId/media (upload)
- GET /api/marketplace/listings/:listingId/media (get all media)
- DELETE /api/marketplace/listings/:listingId/media/:mediaId (delete)
- PUT /api/marketplace/listings/:listingId/media/reorder (reorder)
- PUT /api/marketplace/listings/:listingId/media/:mediaId/primary (set primary)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN running the test "should upload a photo successfully" THEN the system returns HTTP 500 instead of HTTP 201

1.2 WHEN running the test "should reject upload without file" THEN the system returns HTTP 500 instead of HTTP 400

1.3 WHEN running the test "should reject upload with invalid media type" THEN the system returns HTTP 500 instead of HTTP 400

1.4 WHEN running the test "should get all media for a listing" THEN the system returns HTTP 500 instead of HTTP 200

1.5 WHEN running the test "should return empty array for listing with no media" THEN the system returns HTTP 500 instead of HTTP 200

1.6 WHEN running the test "should delete media successfully" THEN the system returns HTTP 500 instead of HTTP 200

1.7 WHEN running the test "should return 404 for non-existent media" THEN the system returns HTTP 500 instead of HTTP 404

1.8 WHEN running the test "should return 403 for unauthorized deletion" THEN the system returns HTTP 500 instead of HTTP 403

1.9 WHEN running the test "should reorder media successfully" THEN the system returns HTTP 500 instead of HTTP 200

1.10 WHEN running the test "should reject invalid mediaOrder format" THEN the system returns HTTP 500 instead of HTTP 400

1.11 WHEN running the test "should return 403 for unauthorized reorder" THEN the system returns HTTP 500 instead of HTTP 403

1.12 WHEN running the test "should set primary media successfully" THEN the system returns HTTP 500 instead of HTTP 200

1.13 WHEN running the test "should return 404 for non-existent media" (set primary) THEN the system returns HTTP 500 instead of HTTP 404

1.14 WHEN running the test "should return 400 for non-photo media" THEN the system returns HTTP 500 instead of HTTP 400

### Expected Behavior (Correct)

2.1 WHEN running the test "should upload a photo successfully" THEN the system SHALL return HTTP 201 with success response

2.2 WHEN running the test "should reject upload without file" THEN the system SHALL return HTTP 400 with error message "No file uploaded"

2.3 WHEN running the test "should reject upload with invalid media type" THEN the system SHALL return HTTP 400 with error message containing "Invalid media type"

2.4 WHEN running the test "should get all media for a listing" THEN the system SHALL return HTTP 200 with array of media items

2.5 WHEN running the test "should return empty array for listing with no media" THEN the system SHALL return HTTP 200 with empty array

2.6 WHEN running the test "should delete media successfully" THEN the system SHALL return HTTP 200 with success message

2.7 WHEN running the test "should return 404 for non-existent media" THEN the system SHALL return HTTP 404 with error message containing "not found"

2.8 WHEN running the test "should return 403 for unauthorized deletion" THEN the system SHALL return HTTP 403 with error message containing "Unauthorized"

2.9 WHEN running the test "should reorder media successfully" THEN the system SHALL return HTTP 200 with success message

2.10 WHEN running the test "should reject invalid mediaOrder format" THEN the system SHALL return HTTP 400 with error message containing "must be an array"

2.11 WHEN running the test "should return 403 for unauthorized reorder" THEN the system SHALL return HTTP 403 with error message containing "Unauthorized"

2.12 WHEN running the test "should set primary media successfully" THEN the system SHALL return HTTP 200 with success message

2.13 WHEN running the test "should return 404 for non-existent media" (set primary) THEN the system SHALL return HTTP 404 with error message containing "not found"

2.14 WHEN running the test "should return 400 for non-photo media" THEN the system SHALL return HTTP 400 with error message containing "Only photos"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the media controller is used in production with real services THEN the system SHALL CONTINUE TO function correctly with actual service implementations

3.2 WHEN the controller handles errors from services THEN the system SHALL CONTINUE TO return appropriate HTTP status codes based on error types

3.3 WHEN the controller validates request parameters THEN the system SHALL CONTINUE TO perform validation before calling services
