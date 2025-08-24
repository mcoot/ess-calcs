# ESS Tax Calculator - Overview

## Project Goals

This Next.js web application provides utilities for Australian (ATO) tax calculations related to Employee Share Scheme (ESS) income and share sales. The app helps users navigate complex tax implications including:

- Capital gains/loss tracking for ESS share sales
- Handling sales within 30 days of vesting (affecting discount taxation)
- Currency conversion from USD to AUD on specific sale dates
- ESS income calculations and tax treatment
- Comprehensive reporting for tax filing purposes

## Target Users

- Australian employees with Employee Share Schemes
- Tax professionals handling ESS calculations
- Individuals needing to calculate capital gains/losses on share sales

## Initial Pages/Features

### 1. Home/Dashboard Page
- Welcome screen with overview of features
- Quick access to main tools
- Recent calculations/imports summary

### 2. CSV Import Page
- File upload interface for share sale reports
- Format validation and preview
- Support for multiple CSV formats (starting with sample format)
- Data mapping and field recognition

### 3. Transaction Processing Page
- Display imported transactions in tabular format
- Edit/validate individual transactions
- Flag sales within 30 days of vesting
- Currency conversion status and rates

### 4. Tax Calculations Page
- ESS income calculations
- Capital gains/losses computation
- 30-day rule impact analysis
- Tax year breakdown

### 5. Reports Page
- Generate tax-ready reports
- Export calculations for accountants
- Summary for tax return preparation
- Historical data comparison

### 6. Settings Page
- User preferences
- Default currency conversion sources
- Tax year settings
- Export format preferences

## Key Features

### Data Processing
- Parse CSV files with share sale data
- Handle multiple grant types (RSU, Options, etc.)
- Track acquisition dates vs sale dates
- Identify sales within 30-day periods

### Tax Calculations
- Apply ESS discount rules
- Calculate capital gains using cost basis
- Handle currency conversions at transaction dates
- Generate tax year summaries

### Compliance
- Follow ATO ESS taxation guidelines
- Implement 30-day rule correctly
- Proper treatment of different share types
- Accurate currency conversion timing

## Technical Considerations

- Next.js framework for modern web development
- CSV parsing and validation
- Currency conversion API integration
- Local data storage for user privacy
- Responsive design for mobile/desktop use
- Export functionality for various formats

## Sample Data Format

Based on the provided sample CSV, the app will initially support files with these key fields:
- Sale Date, Original Acquisition Date
- Grant information and employee details
- Cost basis and sale proceeds (in AUD)
- Sale type and quantity information
- 30-day flag ("Sold Within 30 Days of Vest")
- Brokerage fees and commissions

The application will be designed with flexibility to support additional CSV formats in the future.