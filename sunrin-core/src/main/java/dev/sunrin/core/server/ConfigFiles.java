package dev.sunrin.core.server;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Set;

/** Narrow config adapter: no arbitrary paths and no bypass of KubeJS's Java class filter. */
public final class ConfigFiles {
    private static final Set<String> NAMES = Set.of("random-box", "furniture-box", "geonpi");
    private static final long MAX_BYTES = 2L * 1024 * 1024;
    private ConfigFiles() {}
    public static String read(Path configDirectory, Path defaultsDirectory, String name) {
        if (!NAMES.contains(name)) throw new IllegalArgumentException("지원하지 않는 선린 설정 이름입니다.");
        Path target = configDirectory.resolve(name + ".json"), source = defaultsDirectory.resolve(name + ".json");
        try {
            if (Files.isSymbolicLink(configDirectory) || Files.isSymbolicLink(configDirectory.getParent())) throw new IOException("링크 설정 폴더는 사용할 수 없습니다.");
            Files.createDirectories(configDirectory);
            if (!Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
                if (!Files.isRegularFile(source, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(defaultsDirectory) || Files.size(source) > MAX_BYTES) throw new IOException("기본 설정을 확인할 수 없습니다.");
                // Default copy never replaces a file another process/operator has created.
                try { Files.copy(source, target); } catch (FileAlreadyExistsException alreadyCreated) { /* Inspect, never overwrite. */ }
            }
            if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS) || Files.size(target) > MAX_BYTES) throw new IOException("설정 파일이 일반 파일이 아니거나 너무 큽니다.");
            return Files.readString(target, StandardCharsets.UTF_8);
        } catch (IOException error) { throw new IllegalStateException("선린 설정을 읽지 못했습니다 (" + name + "): " + error.getMessage(), error); }
    }
}
