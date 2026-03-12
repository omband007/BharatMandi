# Implementation Plan

## Overview
This plan addresses multiple UI/UX issues in the Marketplace.html page following the bugfix workflow methodology. The issues include missing profile images, incorrect labeling, poor layout, and missing image viewing functionality.

---

- [x] 1. Write bug condition exploration tests
  - **Property 1: Fault Condition** - Marketplace UI Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface concrete examples that demonstrate each UI bug exists
  - Test 1.1: Verify listings table displays primary images as profile pictures
  - Test 1.2: Verify listing details section heading displays "Listing details" (not "Purchase Details")
  - Test 1.3: Verify Listings and Listing Details sections are displayed side by side (not vertically stacked)
  - Test 1.4: Verify images display correctly in listing details
  - Test 1.5: Verify full-screen image viewing functionality with navigation exists
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document specific failures found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Non-Buggy Marketplace Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy functionality
  - Test 2.1: Verify listings table displays listing data correctly (title, description, price, etc.)
  - Test 2.2: Verify listing selection functionality works (clicking a listing shows details)
  - Test 2.3: Verify listing details section displays all listing information correctly
  - Test 2.4: Verify existing navigation and interaction patterns remain functional
  - Write tests capturing observed behavior patterns that should be preserved
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: All existing functionality_

- [x] 3. Fix Marketplace UI Issues

  - [x] 3.1 Fix listings table to display primary images as profile pictures
    - Locate the listings table rendering code in Marketplace.html
    - Add image column or modify existing structure to display primary images
    - Ensure images are properly sized and styled as profile pictures
    - Handle cases where listings don't have primary images (placeholder/default image)
    - _Bug_Condition: Listings table does not display primary images_
    - _Expected_Behavior: Each listing shows its primary image as a profile picture_
    - _Preservation: Existing listing data display remains unchanged_
    - _Requirements: 1.1_

  - [x] 3.2 Fix listing details section heading
    - Locate the heading element in the listing details section
    - Change text from "Purchase Details" to "Listing details"
    - Verify heading styling remains consistent
    - _Bug_Condition: Heading displays "Purchase Details"_
    - _Expected_Behavior: Heading displays "Listing details"_
    - _Preservation: Other section headings remain unchanged_
    - _Requirements: 1.2_

  - [x] 3.3 Fix layout to display sections side by side
    - Locate the container elements for Listings and Listing Details sections
    - Modify CSS/layout to display sections side by side instead of vertically stacked
    - Implement responsive design considerations (may stack on mobile)
    - Ensure proper spacing and proportions between sections
    - Test layout at different viewport sizes
    - _Bug_Condition: Sections are stacked vertically_
    - _Expected_Behavior: Sections are displayed side by side_
    - _Preservation: Content within each section remains unchanged_
    - _Requirements: 1.3_

  - [x] 3.4 Fix image display in listing details
    - Locate image rendering code in listing details section
    - Ensure images are properly loaded and displayed
    - Fix any broken image paths or rendering issues
    - Implement proper image sizing and aspect ratio handling
    - _Bug_Condition: Images not displaying correctly in listing details_
    - _Expected_Behavior: Images display correctly with proper sizing_
    - _Preservation: Other listing detail fields remain unchanged_
    - _Requirements: Introduction item 4_

  - [x] 3.5 Implement full-screen image viewing with navigation
    - Create modal/overlay component for full-screen image viewing
    - Implement click handler on listing detail images to open full-screen view
    - Add navigation controls (next/previous) for multiple images
    - Add close button to exit full-screen view
    - Implement keyboard navigation (arrow keys, escape)
    - Ensure proper z-index and overlay styling
    - _Bug_Condition: Missing full-screen image viewing functionality_
    - _Expected_Behavior: Users can view images full-screen with navigation_
    - _Preservation: Existing image display in details section remains functional_
    - _Requirements: Introduction item 5_

  - [x] 3.6 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Marketplace UI Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run all bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: All tests PASS (confirms bugs are fixed)
    - _Requirements: 1.1, 1.2, 1.3, and all introduction items_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Functionality Preserved
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all existing functionality still works after fixes (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run complete test suite (exploration + preservation tests)
  - Verify all UI fixes are working as expected
  - Test in different browsers if applicable
  - Ensure responsive behavior works correctly
  - Ask the user if questions arise or manual testing is needed
