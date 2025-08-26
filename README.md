# Activity Points Tracker

A lightweight Windows desktop widget for tracking daily activity point progress toward sales goals.

## Features

- **Ultra-Compact Design**: 400x48px taskbar widget
- **Real-Time Progress**: Visual timeline with color-coded status (red/yellow/green)
- **Flexible Shifts**: Configurable start/end times with smart coupling
- **Activity Updates**: Click to enter current points from HubSpot
- **Window Dragging**: Repositionable anywhere on screen
- **Data Persistence**: Daily reset with settings retention

## Quick Start

### For Windows Users (No Admin Rights)
1. Download the latest `.exe` file from [Releases](../../releases)
2. Double-click to run - no installation required
3. Click progress bar to update activity points
4. Right-click for settings (shift times, targets)

### For Developers
```bash
git clone https://github.com/jorgezpina/sales-productivity-tracker.git
cd sales-productivity-tracker
npm install
npm start
```

## Usage

- **Update Points**: Click the progress bar and enter your current HubSpot activity points
- **Settings**: Right-click anywhere to configure shift times and daily targets
- **Lock/Unlock**: Use the 🔒/🔓 button to toggle end time coupling (auto +8hrs vs manual)
- **Move Window**: Click and drag gray areas to reposition
- **Color Coding**:
  - 🟢 Green: On track or ahead
  - 🟡 Yellow: Slightly behind (within tolerance)
  - 🔴 Red: Significantly behind schedule

## Technical Details

- **Platform**: Electron-based desktop application
- **Memory Usage**: <50MB RAM
- **Update Frequency**: 5-minute intervals
- **Data Storage**: Local JSON file in user data directory

## Development

Built with Electron, HTML5, CSS3, and JavaScript. See [ACTIVITY_POINTS_TRACKER_PLAN.md](ACTIVITY_POINTS_TRACKER_PLAN.md) for detailed project documentation.

## License

ISC License - Free for personal and commercial use.