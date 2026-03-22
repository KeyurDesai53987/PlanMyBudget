# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-03-22

### Added
- **PWA Support**: App can now be installed on desktop and mobile devices
- **Full Backup & Restore**: Export/import all your data (accounts, transactions, goals, categories, recurring)
- **Loading Skeletons**: Better loading experience with skeleton screens
- **Password Strength Indicator**: Visual feedback when creating passwords
- **Remember Me**: Email auto-fill on login
- **Mobile Responsive**: Improved touch targets and layouts
- **App Updates**: In-app update check for macOS desktop app
- **Database Indexes**: Improved query performance with 14 indexes
- **Request Logging**: API request logging for debugging
- **Security Improvements**:
  - Helmet.js for security headers
  - Input validation and sanitization
  - Body size limits
  - Rate limiting with Upstash Redis
  - Row Level Security (RLS) policies
  - Password hashing with bcrypt

### Changed
- **Project Rename**: SaveIt → PlanMyBudget
- **API Key Management**: Added to Settings page (hidden temporarily)
- **Electron App**: Now uses production API directly instead of local server

### Fixed
- SPA routing issues on Vercel
- Remember Me functionality
- Various UI/UX improvements

## [1.0.0] - 2026-03-20

### Added
- User authentication (register, login, logout)
- OTP verification for registration
- Account management (checking, savings, credit, cash, investment)
- Transaction tracking (income/expense)
- Category management
- Budget planning
- Savings goals
- Recurring transactions
- Visual charts and analytics
- Dark/Light theme toggle
- CSV export
- REST API with API key authentication
- macOS desktop app (Electron)
- Google OAuth login (optional)

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.1.0 | 2026-03-22 | Latest |
| 1.0.0 | 2026-03-20 | Initial |
