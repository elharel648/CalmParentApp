const { withInfoPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withLiveActivity = (config) => {
  // 1. עדכון Info.plist של האפליקציה הראשית
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.NSAppleEventsUsageDescription = 'האפליקציה צריכה גישה ל-Live Activities';
    return config;
  });

  // 2. העתקת קבצי Swift ו-Info.plist + יצירת Entitlements
  // חשוב: זה חייב להיות לפני withXcodeProject כדי שהקבצים יהיו קיימים
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const widgetName = 'CalmParentLiveActivity';
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      
      // נתיבים: מקור (בשורש הפרויקט) ויעד (ב-ios/)
      const sourceDir = path.join(projectRoot, widgetName);
      const targetDir = path.join(iosRoot, widgetName);
      
      // יצירת תיקיית היעד
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // רשימת הקבצים להעתקה
      const filesToCopy = [
        'CalmParentLiveActivity.swift',
        'CalmParentLiveActivityBundle.swift',
        'ActivityKitManager.swift',
        'Info.plist',
      ];
      
      // העתקת הקבצים
      let copiedCount = 0;
      filesToCopy.forEach((fileName) => {
        const sourcePath = path.join(sourceDir, fileName);
        const targetPath = path.join(targetDir, fileName);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied ${fileName} to ${targetDir}`);
          copiedCount++;
        } else {
          console.warn(`⚠️  Source file not found: ${sourcePath}`);
        }
      });
      
      if (copiedCount === 0) {
        console.warn(`⚠️  No files found in ${sourceDir}. Make sure the Swift files exist in the root ${widgetName}/ folder.`);
      }
      
      // יצירת Entitlements (אם לא קיים)
      const entitlementsPath = path.join(targetDir, `${widgetName}.entitlements`);
      if (!fs.existsSync(entitlementsPath)) {
        const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.usernotifications.live-activities</key>
	<true/>
</dict>
</plist>`;
        fs.writeFileSync(entitlementsPath, entitlementsContent);
        console.log(`✅ Created ${widgetName}.entitlements`);
      }
      
      // יצירת Info.plist אם לא הועתק
      const infoPlistPath = path.join(targetDir, 'Info.plist');
      if (!fs.existsSync(infoPlistPath)) {
        const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>CalmParent Live Activity</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;
        fs.writeFileSync(infoPlistPath, infoPlistContent);
        console.log(`✅ Created Info.plist`);
      }
      
      console.log(`✅ ${widgetName} files processed successfully (${copiedCount}/${filesToCopy.length} files copied).`);
      return config;
    }
  ]);

  // 3. הגדרות Xcode Target
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const widgetName = 'CalmParentLiveActivity';
    
    if (xcodeProject.pbxTargetByName(widgetName)) {
      return config;
    }

    const bundleId = `${config.ios.bundleIdentifier}.${widgetName}`;
    const pbxProjectSection = xcodeProject.pbxProjectSection();
    const projectUuid = Object.keys(pbxProjectSection).find(key => key !== 'undefined' && !key.endsWith('_comment'));
    const mainGroupKey = pbxProjectSection[projectUuid].mainGroup;

    const target = xcodeProject.addTarget(widgetName, 'app_extension', widgetName);
    
    const files = [
      'CalmParentLiveActivity.swift',
      'CalmParentLiveActivityBundle.swift',
      'ActivityKitManager.swift'
    ];

    files.forEach(file => {
      const filePath = path.join(widgetName, file);
      xcodeProject.addSourceFile(filePath, { target: target.uuid }, mainGroupKey);
    });

    ['ActivityKit.framework', 'WidgetKit.framework', 'SwiftUI.framework'].forEach(f => {
      xcodeProject.addFramework(f, { target: target.uuid, weak: true });
    });

    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    Object.keys(configurations).forEach(key => {
      const configObj = configurations[key];
      if (typeof configObj === 'object' && configObj.buildSettings) {
        const settings = configObj.buildSettings;
        if (settings.PRODUCT_NAME === `"${widgetName}"` || settings.PRODUCT_NAME === widgetName) {
          settings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
          settings.IPHONEOS_DEPLOYMENT_TARGET = '16.1';
          settings.SWIFT_VERSION = '5.0';
          settings.CODE_SIGN_ENTITLEMENTS = `"${widgetName}/${widgetName}.entitlements"`;
          settings.INFOPLIST_FILE = `"${widgetName}/Info.plist"`;
          settings.SKIP_INSTALL = 'YES';
        }
      }
    });

    return config;
  });

  return config;
};

module.exports = withLiveActivity;