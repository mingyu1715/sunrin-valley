package dev.sunrin.core.domain;

import java.util.UUID;

/** Dependency-free behavioral tests, runnable with any JDK >=17. */
public final class DomainTests {
    private static int checks;
    private static void eq(Object expected, Object actual) {
        checks++;
        if (!expected.equals(actual)) throw new AssertionError(expected + " != " + actual);
    }
    private static void rejects(Runnable action) {
        checks++;
        try { action.run(); } catch (IllegalArgumentException | IllegalStateException expected) { return; }
        throw new AssertionError("Expected invalid input to be rejected");
    }
    public static void main(String[] args) throws Exception {
        eq("선린", ProfileRules.validateTitle("선린"));
        eq("가", ProfileRules.validateTitle("가"));
        eq("가나다라마바사아자차", ProfileRules.validateTitle("가나다라마바사아자차"));
        eq("😀😀😀😀😀😀😀😀😀😀", ProfileRules.validateTitle("😀😀😀😀😀😀😀😀😀😀"));
        rejects(() -> ProfileRules.validateTitle(""));
        rejects(() -> ProfileRules.validateTitle("가나다라마바사아자차카"));
        rejects(() -> ProfileRules.validateTitle("   "));
        rejects(() -> ProfileRules.validateTitle("관리\n자"));
        rejects(() -> ProfileRules.validateTitle("§c관리자"));
        rejects(() -> ProfileRules.validateTitle("관리\u202e자"));
        rejects(() -> ProfileRules.validateTitle("\ud800"));
        eq("[선린]", ProfileRules.wrap("선린", "square"));
        eq("<선린>", ProfileRules.wrap("선린", "angle"));
        eq("【선린】", ProfileRules.wrap("선린", "corner"));
        rejects(() -> ProfileRules.wrap("선린", "command"));
        eq(0xffaa00, ProfileRules.color("gold"));
        rejects(() -> ProfileRules.color("#fffffe"));
        ProfileRules.Profile before = ProfileRules.Profile.defaults();
        ProfileRules.Profile title = before.withTitle("선린", "angle", "gold");
        ProfileRules.Profile colored = title.withNameColor("aqua");
        eq("선린", colored.titleText());
        eq("angle", colored.titleStyle());
        eq("gold", colored.titleColor());
        eq("aqua", colored.nameColor());
        eq("white", title.nameColor());
        eq(false, before.hasNameColor());
        eq(false, title.hasNameColor());
        eq(true, colored.hasNameColor());
        eq("", before.titleText());

        UUID transaction = UUID.randomUUID();
        OpeningTimeline normal = new OpeningTimeline(transaction, false, 0L);
        eq(false, normal.isResult(999_000_000L));
        eq(true, normal.isResult(10_000_000_000L));
        OpeningTimeline prank = new OpeningTimeline(transaction, true, 0L);
        eq(false, prank.isResult(4_500_000_000L));
        prank.skip(1_000_000_000L);
        eq(true, prank.isResult(1_000_000_000L));
        eq(transaction, prank.transaction());
        prank.setAuto(true);
        eq(false, prank.claimNext(1_100_000_000L, 3));
        eq(true, prank.claimNext(2_000_000_000L, 3));
        eq(false, prank.claimNext(2_100_000_000L, 3));
        OpeningTimeline empty = new OpeningTimeline(UUID.randomUUID(), false, 0L);
        empty.setAuto(true); empty.skip(0L);
        eq(false, empty.claimNext(2_000_000_000L, 0));
        eq(false, empty.isAuto());
        OpeningTimeline closed = new OpeningTimeline(UUID.randomUUID(), true, 0L);
        closed.setAuto(true); closed.skip(0L); closed.close();
        eq(false, closed.claimNext(2_000_000_000L, 9));
        java.nio.file.Path directory = java.nio.file.Files.createTempDirectory("sunrin-config-");
        try {
            var defaults = directory.resolve("defaults"); java.nio.file.Files.createDirectories(defaults);
            java.nio.file.Files.writeString(defaults.resolve("random-box.json"), "{\"version\":\"first\"}");
            var config = directory.resolve("config/sunrin");
            eq("{\"version\":\"first\"}", dev.sunrin.core.server.ConfigFiles.read(config, defaults, "random-box"));
            java.nio.file.Files.writeString(config.resolve("random-box.json"), "null");
            eq("null", dev.sunrin.core.server.ConfigFiles.read(config, defaults, "random-box"));
            java.nio.file.Files.writeString(config.resolve("random-box.json"), "{invalid");
            eq("{invalid", dev.sunrin.core.server.ConfigFiles.read(config, defaults, "random-box"));
            rejects(() -> dev.sunrin.core.server.ConfigFiles.read(config, defaults, "../../outside"));
            java.nio.file.Files.createDirectory(config.resolve("geonpi.json"));
            rejects(() -> dev.sunrin.core.server.ConfigFiles.read(config, defaults, "geonpi"));
            eq(true, java.nio.file.Files.isDirectory(config.resolve("geonpi.json")));
            try {
                java.nio.file.Files.createSymbolicLink(config.resolve("furniture-box.json"), defaults.resolve("random-box.json"));
                rejects(() -> dev.sunrin.core.server.ConfigFiles.read(config, defaults, "furniture-box"));
                eq("{\"version\":\"first\"}", java.nio.file.Files.readString(defaults.resolve("random-box.json")));
            } catch (UnsupportedOperationException | java.nio.file.AccessDeniedException unavailable) {
                System.out.println("Symlink creation unavailable on this test host; runtime guard still enabled");
            }
        } finally {
            try (var files = java.nio.file.Files.walk(directory)) {
                for (var file : files.sorted(java.util.Comparator.reverseOrder()).toList()) java.nio.file.Files.deleteIfExists(file);
            }
        }
        OperatorLeaseTests.run();
        System.out.println("Domain tests passed: " + checks + " checks");
    }
}
