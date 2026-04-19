const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require("expo/config-plugins");

/**
 * Expo Config Plugin: Fixes Kotlin dependency conflicts.
 *
 * Root cause: expo-dev-launcher 6.0.20 declares kotlinx-datetime:0.7.1,
 * which moved Clock/Instant to kotlin.time.* (requires Kotlin 2.1.20+).
 * Our project uses Kotlin 2.1.0 which doesn't have kotlin.time.Clock.
 *
 * Fix: Force kotlinx-datetime to 0.6.1 (Clock/Instant still in kotlinx.datetime.*)
 * Combined with a patch-package patch that changes the imports in
 * FetchDevelopmentServersButton.kt to use kotlinx.datetime.Clock/Instant.
 */
const withKotlinStdlibFix = (config) => {
  // 1. Modify the ROOT build.gradle (project-level)
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      if (!contents.includes("kotlin-stdlib-fix-v3")) {
        const snippet = `
// kotlin-stdlib-fix-v3
// Force kotlinx-datetime to 0.6.1 which still has Clock/Instant in kotlinx.datetime.*
// Force kotlin-stdlib to match the project's Kotlin compiler version (2.1.0)
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'org.jetbrains.kotlin:kotlin-stdlib:2.1.0'
            force 'org.jetbrains.kotlin:kotlin-stdlib-common:2.1.0'
            force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.1.0'
            force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.1.0'
            force 'org.jetbrains.kotlin:kotlin-reflect:2.1.0'
            force 'org.jetbrains.kotlinx:kotlinx-datetime:0.6.1'
            force 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3'
            force 'org.jetbrains.kotlinx:kotlinx-serialization-core:1.7.3'
            force 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0'
            force 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0'
        }
    }
}
`;
        contents += "\n" + snippet;
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  // 2. Modify the APP build.gradle (module-level)
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      if (!contents.includes("kotlin-stdlib-app-fix-v3")) {
        const snippet = `
// kotlin-stdlib-app-fix-v3
configurations.all {
    resolutionStrategy {
        force 'org.jetbrains.kotlin:kotlin-stdlib:2.1.0'
        force 'org.jetbrains.kotlin:kotlin-stdlib-common:2.1.0'
        force 'org.jetbrains.kotlin:kotlin-reflect:2.1.0'
        force 'org.jetbrains.kotlinx:kotlinx-datetime:0.6.1'
    }
}
`;
        contents += "\n" + snippet;
      }

      // Add packaging exclusion for duplicate META-INF files
      if (!contents.includes("meta-inf-exclusion-fix")) {
        const packagingSnippet = `
// meta-inf-exclusion-fix
android {
    packagingOptions {
        resources {
            excludes += [
                'META-INF/versions/9/OSGI-INF/MANIFEST.MF',
                'META-INF/DEPENDENCIES',
                'META-INF/LICENSE',
                'META-INF/LICENSE.txt',
                'META-INF/license.txt',
                'META-INF/NOTICE',
                'META-INF/NOTICE.txt',
                'META-INF/notice.txt',
                'META-INF/ASL2.0',
                'META-INF/*.kotlin_module'
            ]
        }
    }
}
`;
        contents += "\n" + packagingSnippet;
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  return config;
};

module.exports = withKotlinStdlibFix;
