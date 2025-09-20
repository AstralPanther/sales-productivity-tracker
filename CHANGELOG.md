# Changelog
All notable changes to the Sales Productivity Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2024-12-21

### 🎯 Added
- **Sales History Section**: Complete sales tracking interface on main page
  - Collapsible monthly sections with editable monthly totals
  - Individual sale entries (date + amount) directly editable by clicking
  - Sort by recency (newest first) within months and globally
  - Delete individual entries with confirmation
  - "Add Sale" button for quick entry
- **Enhanced Sales Rate System**: Auto/Manual toggle for sales projections
  - Auto mode: calculates from 30-day sales history average
  - Manual mode: user-defined daily sales rate
  - Live display of current rate in "(Current: $XXX/day)" format
  - Rate affects all goal completion time calculations
- **Working Days Calculations**: More accurate time projections
  - "Days until" changed to "working days until" (excludes weekends)
  - Completion dates account for weekends in calendar projections
  - Time format: "5wd", "3wk", "2mo" for working days/weeks/months
- **Complete Backup System**: File System Access API implementation
  - Export all data to timestamped JSON files
  - Human-readable backup format with organized structure
  - Import functionality to restore complete application state
  - Chrome/Chromium browser support with clear compatibility notices
- **Version Information**: In-app version display and changelog
  - Version number displayed on main page
  - "What's New" clickable link to view changelog
  - Structured changelog with categorized updates

### 🔧 Fixed
- **Monthly Revenue Calculation**: Now properly cumulative from sales history
  - Previously tracked as separate variable, now calculates from actual sales data
  - More accurate month-to-date revenue totals
  - Properly affects goal completion calculations
- **Goal Creation Bugs**: Multiple UX improvements
  - Enter key now properly saves goals instead of closing menu
  - Immediate visual updates when adding goals (no menu switching required)
  - Fixed ID mismatch between HTML and JavaScript references
- **Default Settings**: Improved user experience
  - Changed default goal icon from laptop (💻) to target (🎯)
  - Updated section labels: "Museum of Triumphs" → "Done", "Current Goals" → "Next"
- **Backup System Reliability**: Property mapping corrections
  - Fixed property name mismatches in backup/restore functions
  - Added sales rate settings to backup data
  - Proper error handling for Vivaldi and other Chromium browsers

### 🎨 Changed
- **Purchase Goal Display**: Enhanced "Done" section
  - Shows purchase dates for completed goals in chronological order
  - Format: "✅ Goal Name 📅 Dec 15"
  - Maintains Mountain numbering system with proper sorting
- **Dark Mode Support**: Improved consistency
  - Better CSS variable usage across all components
  - Fixed dark mode compatibility in goal items and revenue sections
- **Time Display Format**: More intuitive working days presentation
  - Clear distinction between working days and calendar days
  - Weekend-aware date calculations for accurate projections

## [1.4.0] - Previous Version
- Basic goal tracking and commission calculations
- Monthly revenue targets and progress bars
- Purchase goal management with icons
- Basic backup functionality

## Version Control Strategy

### Backup System
- Automatic timestamped backups before major changes
- Manual backup creation via `cp web-version.html backups/web-version-$(date +%Y%m%d-%H%M%S).html`
- Stable version maintained as `web-version-stable.html`

### Development Workflow
1. Create backup before starting work session
2. Make incremental changes with frequent saves
3. Test functionality after each major feature
4. Update version number and changelog
5. Commit to git with descriptive messages
6. Tag releases with version numbers

### Rollback Procedures
- **Immediate rollback**: `cp backups/[latest-stable] web-version.html`
- **Git rollback**: `git checkout [version-tag]`
- **Feature disable**: Use feature flags in future versions