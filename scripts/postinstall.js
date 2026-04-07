/**
 * Postinstall script to patch dependencies for compatibility.
 * 
 * 1. Patches @clerk/expo NativeClerkModule.ts for RN 0.81 codegen
 * 2. Patches react-native-health-connect build.gradle for Kotlin 2.x
 */
const fs = require('fs');
const path = require('path');

// ===== Patch 1: @clerk/expo codegen fix =====
const clerkFilePath = path.join(
  __dirname, '..', 'node_modules', '@clerk', 'expo', 'src', 'specs', 'NativeClerkModule.ts'
);

try {
  if (fs.existsSync(clerkFilePath)) {
    let content = fs.readFileSync(clerkFilePath, 'utf8');
    const oldPattern = "export default TurboModuleRegistry?.get<Spec>('ClerkExpo') ?? null;";
    const newPattern = "export default TurboModuleRegistry.get<Spec>('ClerkExpo');";

    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(clerkFilePath, content, 'utf8');
      console.log('[postinstall] ✅ Patched @clerk/expo NativeClerkModule.ts');
    } else {
      console.log('[postinstall] @clerk/expo already patched or has different content.');
    }
  } else {
    console.log('[postinstall] @clerk/expo NativeClerkModule.ts not found, skipping.');
  }
} catch (err) {
  console.warn('[postinstall] Failed to patch @clerk/expo:', err.message);
}

// ===== Patch 2: react-native-health-connect build.gradle for Kotlin 2.x =====
const healthConnectGradlePath = path.join(
  __dirname, '..', 'node_modules', 'react-native-health-connect', 'android', 'build.gradle'
);

try {
  if (fs.existsSync(healthConnectGradlePath)) {
    let gradle = fs.readFileSync(healthConnectGradlePath, 'utf8');
    let patched = false;

    // Fix 1: Upgrade Java compatibility from 1.8 to 17 (required for Kotlin 2.x)
    if (gradle.includes('JavaVersion.VERSION_1_8')) {
      gradle = gradle.replace(/JavaVersion\.VERSION_1_8/g, 'JavaVersion.VERSION_17');
      patched = true;
    }

    // Fix 2: Upgrade kotlinx-coroutines to a Kotlin 2.x compatible version
    if (gradle.includes("kotlinx-coroutines-android:1.7.3")) {
      gradle = gradle.replace(
        "kotlinx-coroutines-android:1.7.3",
        "kotlinx-coroutines-android:1.8.1"
      );
      patched = true;
    }

    // Fix 3: Upgrade Health Connect SDK from alpha to stable
    if (gradle.includes("connect-client:1.1.0-alpha11")) {
      gradle = gradle.replace(
        "connect-client:1.1.0-alpha11",
        "connect-client:1.1.0-alpha10"
      );
      // Keep alpha10 which is known to work; alpha11 may have issues
      // Actually let's keep the original and only fix Java/coroutines
      // Revert this specific change
      gradle = gradle.replace(
        "connect-client:1.1.0-alpha10",
        "connect-client:1.1.0-alpha11"
      );
    }

    if (patched) {
      fs.writeFileSync(healthConnectGradlePath, gradle, 'utf8');
      console.log('[postinstall] ✅ Patched react-native-health-connect build.gradle for Kotlin 2.x');
    } else {
      console.log('[postinstall] react-native-health-connect build.gradle already patched.');
    }
  } else {
    console.log('[postinstall] react-native-health-connect not found, skipping.');
  }
} catch (err) {
  console.warn('[postinstall] Failed to patch react-native-health-connect:', err.message);
}
