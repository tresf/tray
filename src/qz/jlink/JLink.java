package qz.jlink;

import org.apache.commons.lang3.ArrayUtils;
import org.slf4j.*;
import qz.common.Constants;
import qz.utils.ShellUtilities;
import qz.utils.SystemUtilities;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.LinkedHashSet;

public class JLink {
    private static final Logger log = LoggerFactory.getLogger(JLink.class);
    private static final String JAVA_HOME = System.getProperty("java.home");
    private static final String DOWNLOAD_URL = "https://github.com/AdoptOpenJDK/openjdk%s-binaries/releases/download/jdk-%s/OpenJDK%sU-jdk_%s_%s_%s_%s.%s";
    private static final String JAVA_VERSION = "11.0.7+10";
    private static final String JAVA_MAJOR = JAVA_VERSION.split("\\.")[0];
    private static final String JAVA_VERSION_FILE = JAVA_VERSION.replaceAll("\\+", "_");
    private static final String JAVA_GC_ENGINE = "hotspot";
    private static final String JAVA_ARCH = "x64";
    private static final String JAVA_EXTENSION = SystemUtilities.isWindows() ? "zip" : "tar.gz";

    private String jarPath;
    private String jdepsPath;
    private String jlinkPath;
    private String outPath;
    private LinkedHashSet<String> depList;


    public JLink(String platform) throws IOException {
        log.info("Using JAVA_HOME: {}", JAVA_HOME);
        downloadPlatform(platform)
                .calculateJarPath()
                .calculateOutPath()
                .calculateToolPaths()
                .calculateDepList()
                .deployJre();
    }

    public static void main(String ... args) throws IOException {
        new JLink(args.length > 0 ? args[0] : null);
    }

    private JLink downloadPlatform(String platform) {
        if(platform == null) {
            if(SystemUtilities.isMac()) {
                platform = "mac";
            } else if(SystemUtilities.isWindows()) {
                platform = "windows";
            } else {
                platform = "linux";
            }
            log.info("No platform provided, assuming '{}'", platform);
        }

        // 1. Check to see if the platform has already been downloaded
        // 2. Download if not already
        // 3. Regardless, keep reference to downloaded "jmod" folder, see FIXME below

        // Assume consistent formatting
        String url = String.format(DOWNLOAD_URL, JAVA_MAJOR, JAVA_VERSION,
                                   JAVA_MAJOR, JAVA_ARCH, platform, JAVA_GC_ENGINE,
                                   JAVA_VERSION_FILE, JAVA_EXTENSION);
        System.err.println(url);
        return this;
    }

    private JLink calculateJarPath() throws IOException {
        jarPath = SystemUtilities.getJarPath();
        if(!jarPath.endsWith(".jar")) {
            // Assume running from IDE
            jarPath = Paths.get(SystemUtilities.getJarPath(), "..", "dist", Constants.PROPS_FILE + ".jar").toFile().getCanonicalPath();
        }
        log.info("Assuming jar path: {}", jarPath);
        return this;
    }

    private JLink calculateOutPath() {
        outPath = Paths.get(jarPath, "../jre").toString();
        log.info("Assuming output path: {}", outPath);
        return this;
    }

    private JLink calculateToolPaths() throws IOException {
        jdepsPath = Paths.get(JAVA_HOME, "bin", SystemUtilities.isWindows() ? "jdeps.exe" : "jdeps").toFile().getCanonicalPath();
        jlinkPath = Paths.get(JAVA_HOME, "bin", SystemUtilities.isWindows() ? "jlink.exe" : "jlink").toFile().getCanonicalPath();
        log.info("Assuming jdeps path: {}", jdepsPath);
        log.info("Assuming jlink path: {}", jlinkPath);
        return this;
    }

    private JLink calculateDepList() {
        log.info("Calling jdeps to determine runtime dependencies");
        depList = new LinkedHashSet<>();
        String[] rawList = ShellUtilities.executeRaw(new String[] { jdepsPath, "--list-deps", jarPath}).split("\\r?\\n");
        for(String item : rawList) {
            item = item.trim();
            if(!item.isEmpty()) {
                if(item.startsWith("JDK")) {
                    // Remove e.g. "JDK removed internal API/sun.reflect"
                    log.trace("Removing dependency: '{}'", item);
                    continue;
                }
                if(item.contains("/")) {
                    // Isolate base name e.g. "java.base/com.sun.net.ssl"
                    item = item.split("/")[0];
                }
                depList.add(item);
            }
        }
        return this;
    }

    private JLink deployJre() throws IOException {
        if(ShellUtilities.execute(jlinkPath,
                                  "--module-path", JAVA_HOME + File.separator + "jmod" /* FIXME USE DOWNLOADED PLATFORM */,
                                  "--add-modules", String.join(",", depList),
                                  "--output", outPath)) {
            log.info("Successfully deployed a jre to {}");
            return this;
        }
        throw new IOException("An error occurred deploying the jre.  Please check the logs for details.");
    }

}
