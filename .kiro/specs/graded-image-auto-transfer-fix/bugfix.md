# Bugfix Requirements Document

## Introduction

When a user grades produce in Tile 1 (Grade Produce) on the listing page, the graded image should be automatically transferred to Tile 2 (Create New Listing) and appear in the media preview section. Currently, the graded image is not being transferred, forcing users to manually re-upload the same image. This affects all users on both AWS and localhost environments.

The bug occurs because the `gradeProduceProduce()` function stores only the certificate data in `state.currentCertificate` but does not store the actual graded image file. The `createListing()` function has no access to the graded image, so it cannot display it in the preview or include it in the listing.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user successfully grades produce in Tile 1 THEN the graded image file is not stored in the application state

1.2 WHEN grading completes successfully THEN the graded image does not appear in Tile 2's media preview section

1.3 WHEN a user creates a listing after grading THEN the graded image is not automatically included as the first photo in the listing's media gallery

1.4 WHEN a user wants to include the graded image in their listing THEN they must manually re-upload the same image file using the file input in Tile 2

### Expected Behavior (Correct)

2.1 WHEN a user successfully grades produce in Tile 1 THEN the system SHALL store the graded image file in the application state alongside the certificate data

2.2 WHEN grading completes successfully THEN the system SHALL automatically display the graded image in Tile 2's media preview section before the user clicks "Create Listing"

2.3 WHEN a user creates a listing after grading THEN the system SHALL automatically include the graded image as the first photo in the listing's media gallery

2.4 WHEN the graded image is auto-transferred to Tile 2 THEN the system SHALL display it in the media preview using the same preview mechanism as manually uploaded files

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user manually uploads media files in Tile 2 THEN the system SHALL CONTINUE TO display those files in the media preview section

3.2 WHEN a user creates a listing with manually uploaded media THEN the system SHALL CONTINUE TO include those files in the listing

3.3 WHEN a user attaches a certificate to a listing THEN the system SHALL CONTINUE TO generate and attach the certificate as the last image

3.4 WHEN a user grades produce THEN the system SHALL CONTINUE TO auto-populate the produce type field in Tile 2

3.5 WHEN a user grades produce THEN the system SHALL CONTINUE TO auto-check the "Attach grade certificate" checkbox

3.6 WHEN a user creates a listing without grading first THEN the system SHALL CONTINUE TO allow manual media upload and listing creation

3.7 WHEN multiple media files are uploaded (including the graded image) THEN the system SHALL CONTINUE TO maintain the correct order with the graded image as the first photo
