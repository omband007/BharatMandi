# Investigations

This directory contains detailed investigations of issues, bugs, and anomalies discovered during development and testing.

## Structure

Each investigation is organized in its own subdirectory with:
- Detailed report documents
- Supporting evidence (logs, screenshots, etc.)
- Reproduction steps
- Mitigation strategies

## Current Investigations

### AWS Translate Content Safety Issue (2026-02-28)
- **Location:** `aws-translate-content-safety-2026-02-28/`
- **Severity:** HIGH
- **Status:** Reported to AWS
- **Summary:** AWS Translate generated inappropriate religious content when translating Marathi to Hindi with incorrect source language specification

## Guidelines

When creating a new investigation:
1. Create a new folder with format: `{service-name}-{issue-type}-{YYYY-MM-DD}`
2. Include a detailed report with technical details
3. Add reproduction steps
4. Document impact and mitigation
5. Track resolution status
