package dev.sunrin.core.domain;

import java.text.Normalizer;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ProfileRules {
    public static final Map<String, Integer> COLORS;
    static {
        Map<String, Integer> colors = new LinkedHashMap<>();
        String[] names = {"white", "gray", "dark_gray", "black", "red", "dark_red", "gold", "yellow", "green", "dark_green", "aqua", "dark_aqua", "blue", "dark_blue", "light_purple", "dark_purple"};
        int[] values = {0xffffff, 0xaaaaaa, 0x555555, 0x000000, 0xff5555, 0xaa0000, 0xffaa00, 0xffff55, 0x55ff55, 0x00aa00, 0x55ffff, 0x00aaaa, 0x5555ff, 0x0000aa, 0xff55ff, 0xaa00aa};
        for (int i = 0; i < names.length; i++) colors.put(names[i], values[i]);
        COLORS = Collections.unmodifiableMap(colors);
    }
    private ProfileRules() {}
    public static String validateTitle(String raw) {
        if (raw == null) throw new IllegalArgumentException("칭호를 입력해 주세요.");
        String title = Normalizer.normalize(raw, Normalizer.Form.NFC);
        int length = title.codePointCount(0, title.length());
        if (title.isBlank() || length < 1 || length > 10) throw new IllegalArgumentException("칭호는 1~10글자로 입력해 주세요.");
        title.codePoints().forEach(cp -> {
            int type = Character.getType(cp);
            if (Character.isISOControl(cp) || type == Character.FORMAT || type == Character.SURROGATE || cp == '§' || cp == 0x2028 || cp == 0x2029)
                throw new IllegalArgumentException("칭호에 사용할 수 없는 문자가 있어요.");
        });
        return title;
    }
    public static String wrap(String title, String style) {
        return switch (style) {
            case "square" -> "[" + title + "]";
            case "angle" -> "<" + title + ">";
            case "corner" -> "【" + title + "】";
            default -> throw new IllegalArgumentException("지원하지 않는 칭호 형식입니다.");
        };
    }
    public static int color(String name) {
        Integer value = COLORS.get(name);
        if (value == null) throw new IllegalArgumentException("색상을 다시 선택해 주세요.");
        return value;
    }
    public record Profile(String titleText, String titleStyle, String titleColor, String nameColor, boolean hasNameColor) {
        public static Profile defaults() { return new Profile("", "square", "gold", "white", false); }
        public Profile withTitle(String text, String style, String color) {
            String normalized = validateTitle(text); wrap(normalized, style); ProfileRules.color(color);
            return new Profile(normalized, style, color, nameColor, hasNameColor);
        }
        public Profile withNameColor(String color) {
            ProfileRules.color(color); return new Profile(titleText, titleStyle, titleColor, color, true);
        }
    }
}
