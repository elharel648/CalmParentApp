# Expo Config Plugins

## withLiveActivity.js

This plugin automatically configures your Expo app for iOS Live Activities (ActivityKit).

### What it does:
1. ✅ Adds `NSSupportsLiveActivities: true` to Info.plist
2. ✅ Adds `NSAppleEventsUsageDescription` to Info.plist (required for Live Activities)
3. ✅ Ensures configuration persists across `expo prebuild`

### Usage:
The plugin is already added to `app.json`:
```json
{
  "plugins": [
    "./plugins/withLiveActivity.js"
  ]
}
```

### After adding the plugin:
1. Run `npx expo prebuild --clean` to apply changes
2. All Info.plist entries will be automatically added
3. Configuration will persist even after prebuild

### Note:
The Widget Extension target and Swift files still need to be manually added to Xcode, but the plugin handles all the Info.plist configuration automatically.

### Manual Steps Still Required:
1. Create Widget Extension target in Xcode
2. Add Swift files to the extension
3. Link ActivityKit and WidgetKit frameworks
4. Configure signing

The plugin only handles the Info.plist entries to prevent them from being lost on prebuild.
