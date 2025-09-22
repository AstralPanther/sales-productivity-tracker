# Sales Productivity Tracker

A comprehensive web-based sales productivity and purchase goal management system with real-time progress tracking and visual milestone management.

## Features

- **Comprehensive Tracking**: Activity points, calls, backlog, daily/monthly revenue
- **Purchase Goal Management**: Commission-based purchase planning with visual breadcrumbs
- **Progress Visualization**: Color-coded progress bars with percentage indicators
- **Goal Icons & Organization**: Draggable goals with custom icons and priority management
- **Revenue Path**: Visual milestone tracking toward monthly targets
- **Editable Data**: Click-to-edit individual sales history entries
- **Cross-Platform**: Works in any modern web browser

## Quick Start

### Web Version (Recommended)
1. Download the `web-version.html` file
2. Open in any modern web browser (Chrome, Firefox, Safari, Edge)
3. No installation required - works offline
4. All data stored locally in browser

### For Developers
```bash
git clone https://github.com/jorgezpina/sales-productivity-tracker.git
cd sales-productivity-tracker
# Open web-version.html in browser or run local server
python -m http.server 8000  # Or your preferred local server
```

## Usage

### Daily Tracking
- **Main Dashboard**: Track activity points, calls, backlog, daily/monthly revenue
- **Progress Updates**: Click "Update Progress & Settings" to enter current metrics
- **Visual Feedback**: Color-coded progress bars show real-time status
- **Sales History**: View and edit individual day sales data

### Purchase Goal Management
- **Add Goals**: Create purchase items with costs and custom icons
- **Reorder Priorities**: Drag goals to change priority order
- **Track Progress**: See percentage completion and revenue requirements
- **Visual Milestones**: Monthly revenue path shows goal positions

### Navigation
- **Main Dashboard**: Overview of all progress metrics
- **Goals Page**: Detailed purchase goal management
- **Update & Settings**: Configure targets and commission rates

## Technical Details

- **Platform**: Web-based application (HTML5, CSS3, JavaScript)
- **Storage**: Browser localStorage (no external dependencies)
- **Performance**: Lightweight, runs smoothly in any modern browser
- **Offline Capable**: Works without internet connection
- **Responsive**: Adapts to different screen sizes

## Recent Improvements

- **Fixed Progress Bars**: Visual progress indicators now display correctly at all percentages
- **Enhanced Goal Management**: Drag-and-drop reordering with editable icons
- **Calendar Indicators**: Current date markers on monthly revenue timeline
- **Icon System**: Added tattoo and calligraphy icons to goal picker
- **Layout Improvements**: Moved "Add New Goal" to bottom for better workflow

## Development

Built with vanilla HTML5, CSS3, and JavaScript for maximum compatibility and performance. Single-file architecture for easy deployment and sharing.

## License

ISC License - Free for personal and commercial use.