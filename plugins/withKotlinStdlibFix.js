const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require("expo/config-plugins");

/**
 * Expo Config Plugin: Forces kotlin-stdlib version to match the Kotlin compiler.
 *
 * Problem: A transitive dependency resolves kotlin-stdlib:2.3.10 (metadata 2.3.0),
 * but the Kotlin compiler is 2.1.21 (reads metadata 2.1.0), causing a build crash.
 *
 * Solution: Inject resolutionStrategy.force into BOTH root and app build.gradle
 * to ensure all configurations pin kotlin-stdlib to the compiler's version.
 */
const withKotlinStdlibFix = (config) => {
  // 1. Modify the ROOT build.gradle (project-level)
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let contents = config.modResults.contents;

      if (!contents.includes("kotlin-stdlib-resolution-fix")) {
        const snippet = `
// kotlin-stdlib-resolution-fix
// Force kotlin-stdlib version to match the Kotlin compiler version.
subprojects {
    configurations.configureEach {
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib')) {
                details.useVersion '2.1.21'
                details.because 'kotlin-stdlib must match the Kotlin compiler version'
            }
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

      if (!contents.includes("kotlin-stdlib-app-fix")) {
        const snippet = `
// kotlin-stdlib-app-fix
// Force kotlin-stdlib and kotlinx-serialization to versions compatible with Kotlin 2.1.21
configurations.configureEach {
    resolutionStrategy.eachDependency { details ->
        if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib')) {
            details.useVersion '2.1.21'
            details.because 'kotlin-stdlib must match the Kotlin compiler version 2.1.21'
        }
        if (details.requested.group == 'org.jetbrains.kotlinx' && details.requested.name.startsWith('kotlinx-serialization')) {
            details.useVersion '1.8.0'
            details.because 'kotlinx-serialization must be compatible with Kotlin 2.1.x and @clerk/expo'
        }
    }
}
`;
        contents += "\n" + snippet;
      }

      // Add packaging exclusion for duplicate META-INF files
      if (!contents.includes("meta-inf-exclusion-fix")) {
        const packagingSnippet = `
// meta-inf-exclusion-fix
// Exclude duplicate META-INF files from jspecify and okhttp3 logging-interceptor
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
