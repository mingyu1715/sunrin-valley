package dev.sunrin.core.client;

import com.google.gson.*;
import dev.sunrin.core.domain.OpeningTimeline;
import dev.sunrin.core.domain.ProfileRules;
import dev.sunrin.core.net.CoreNetwork;
import java.util.*;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.item.ItemStack;

/** Client-only entry point; never referenced from the dedicated server packet handler. */
public final class ClientScreens {
    private ClientScreens() {}
    public static void install() { CoreNetwork.setClientReceiver(ClientScreens::receive); }
    private static void receive(CompoundTag data) {
        Minecraft mc = Minecraft.getInstance(); String kind = data.getString("kind");
        switch (kind) {
            case "box" -> {
                boolean auto = mc.screen instanceof BoxScreen previous && previous.timeline.isAuto();
                mc.setScreen(new BoxScreen(data, auto));
            }
            case "box_count" -> { if (mc.screen instanceof BoxScreen screen && screen.timeline.transaction().equals(data.getUUID("transaction"))) screen.remaining = data.getInt("remaining"); }
            case "title", "color" -> mc.setScreen(new ProfileScreen(data));
            case "admin" -> mc.setScreen(new AdminScreen(data));
            case "profiles" -> { ClientProfiles.update(data.getCompound("profiles")); if (mc.level != null) mc.level.players().forEach(player -> player.refreshDisplayName()); }
            case "saved" -> { if (mc.screen instanceof ProfileScreen screen && screen.token.equals(data.getUUID("token"))) { mc.setScreen(null); if (mc.player != null) mc.player.displayClientMessage(Component.literal("저장했어요."), true); } }
            case "error" -> {
                if (mc.screen instanceof Panel screen) screen.error(data.getString("message"));
                else if (mc.player != null) mc.player.displayClientMessage(Component.literal(data.getString("message")), false);
            }
        }
    }
    private abstract static class Panel extends Screen {
        protected int x, y, w, h;
        private String error = ""; private long errorAt;
        protected Panel(String title) { super(Component.literal(title)); }
        @Override protected void init() { w = Math.min(410, width - 20); h = Math.min(286, height - 20); x = (width - w) / 2; y = (height - h) / 2; }
        @Override public boolean isPauseScreen() { return false; }
        protected Button button(String text, int left, int top, int wide, Runnable action) {
            return addRenderableWidget(Button.builder(Component.literal(text), b -> action.run()).bounds(left, top, wide, 20).build());
        }
        protected void panel(GuiGraphics g) {
            renderBackground(g); g.fill(x - 2, y - 2, x + w + 2, y + h + 2, 0xffb7a576);
            g.fill(x, y, x + w, y + h, 0xf51e2827); g.fill(x, y, x + w, y + 34, 0xff334a40);
            g.drawCenteredString(font, title, width / 2, y + 12, 0xfff4e6c2);
        }
        protected void status(GuiGraphics g) {
            if (!error.isEmpty()) {
                long elapsed = System.currentTimeMillis() - errorAt;
                if (elapsed < 2300) { g.fill(x + 5, y + h - 51, x + w - 5, y + h - 37, 0xff1e2827); int alpha = elapsed <= 2000 ? 255 : (int)(255 * (2300 - elapsed) / 300); g.drawCenteredString(font, font.plainSubstrByWidth(error, w - 18), width / 2, y + h - 48, alpha << 24 | 0xffaaa0); }
            }
        }
        void error(String message) { error = message; errorAt = System.currentTimeMillis(); }
    }
    private static final class BoxScreen extends Panel {
        private int tierColor() { return switch (tier) {
            case "uncommon" -> 0xff94cf8a; case "rare" -> 0xff80b8e8; case "epic" -> 0xffc49be7;
            case "seasonal" -> 0xffe99cb9; case "ticket", "utility" -> 0xffe7c979; case "poop" -> 0xffffcf54;
            default -> 0xffd5d9c7;
        }; }
        private final OpeningTimeline timeline;
        private final ItemStack reward;
        private final String tier;
        private int remaining;
        private final JsonArray table;
        private final List<ItemStack> icons = new ArrayList<>();
        private Button again, autoButton, chancesButton;
        private boolean showChances, announced, waiting, goldAnnounced;
        private int chanceOffset;
        BoxScreen(CompoundTag data, boolean auto) {
            super("선린밸리 · 랜덤박스"); reward = ItemStack.of(data.getCompound("reward")); tier = data.getString("tier"); remaining = data.getInt("remaining");
            timeline = new OpeningTimeline(data.getUUID("transaction"), tier.equals("poop"), System.nanoTime()); timeline.setAuto(auto);
            JsonArray parsed;
            try { parsed = JsonParser.parseString(data.getString("probabilities")).getAsJsonArray(); } catch (RuntimeException invalid) { parsed = new JsonArray(); }
            table = parsed;
            for (JsonElement element : table) {
                try { var row = element.getAsJsonObject(); ResourceLocation id = ResourceLocation.tryParse(row.get("item").getAsString()); if (BuiltInRegistries.ITEM.containsKey(id)) icons.add(new ItemStack(BuiltInRegistries.ITEM.get(id))); } catch (RuntimeException ignored) {}
            }
            if (icons.isEmpty()) icons.add(reward.copy());
        }
        @Override protected void init() {
            super.init(); int row = y + h - 30, quarter = (w - 26) / 4;
            again = button("한 번 더", x + 7, row, quarter, this::next);
            autoButton = button("연속 " + (timeline.isAuto() ? "ON" : "OFF"), x + 11 + quarter, row, quarter, () -> { timeline.setAuto(!timeline.isAuto()); autoButton.setMessage(Component.literal("연속 " + (timeline.isAuto() ? "ON" : "OFF"))); });
            chancesButton = button("확률 보기", x + 15 + quarter * 2, row, quarter, () -> { showChances = !showChances; if (showChances) timeline.setAuto(false); autoButton.setMessage(Component.literal("연속 OFF")); });
            button("닫기", x + 19 + quarter * 3, row, quarter, this::onClose);
        }
        private void next() {
            if (waiting || remaining < 1 || !timeline.isResult(System.nanoTime())) return;
            waiting = true; again.active = false; CoreNetwork.act("next", timeline.transaction(), "", "", "");
        }
        @Override public void tick() {
            long now = System.nanoTime(); boolean result = timeline.isResult(now);
            again.active = result && remaining > 0 && !waiting && !showChances;
            if (tier.equals("poop") && !goldAnnounced && timeline.progress(now) > 0.12 && !result) { goldAnnounced = true; minecraft.getSoundManager().play(SimpleSoundInstance.forUI(SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, 0.85f)); }
            if (result && !announced) { announced = true; minecraft.getSoundManager().play(SimpleSoundInstance.forUI(tier.equals("poop") ? SoundEvents.VILLAGER_NO : SoundEvents.PLAYER_LEVELUP, 1.0f)); }
            if (!showChances && !waiting && timeline.claimNext(now, remaining)) next();
            autoButton.setMessage(Component.literal("연속 " + (timeline.isAuto() ? "ON" : "OFF")));
        }
        @Override public boolean mouseClicked(double mx, double my, int button) {
            if (button == 0 && !timeline.isResult(System.nanoTime())) { timeline.skip(System.nanoTime()); return true; }
            return super.mouseClicked(mx, my, button);
        }
        @Override public void render(GuiGraphics g, int mx, int my, float partial) {
            panel(g); long now = System.nanoTime(); boolean result = timeline.isResult(now);
            g.drawString(font, "소유 상자 " + remaining + "개", x + 12, y + 43, 0xffc5d7c1);
            g.drawString(font, "지급 완료", x + w - 64, y + 43, 0xffb7d8a7);
            if (showChances) {
                int line = y + 61, visibleRows = Math.max(1, (h - 108) / 13);
                chanceOffset = Math.max(0, Math.min(chanceOffset, Math.max(0, table.size() - visibleRows)));
                for (int rowIndex = chanceOffset; rowIndex < Math.min(table.size(), chanceOffset + visibleRows); rowIndex++) {
                    JsonObject row = table.get(rowIndex).getAsJsonObject(); String id = row.get("item").getAsString();
                    ItemStack icon = new ItemStack(BuiltInRegistries.ITEM.get(ResourceLocation.tryParse(id)));
                    g.renderItem(icon, x + 18, line - 3);
                    String percent = String.format(Locale.ROOT, "%.2f%%", row.get("weight").getAsInt() / 100.0);
                    g.drawString(font, font.plainSubstrByWidth(icon.getHoverName().getString(), w - 111), x + 39, line, 0xfff4e6c2);
                    g.drawString(font, percent, x + w - 61, line, 0xffd2c09a); line += 13;
                }
                if (table.size() > visibleRows) g.drawCenteredString(font, "스크롤로 나머지 확률 보기", width / 2, y + h - 50, 0xffaebfae);
            } else if (result) {
                int scale = h < 220 ? 2 : 4, iconY = y + (h < 220 ? 58 : 78);
                int glow = tierColor() & 0xffffff;
                g.fill(width / 2 - 8 * scale - 4, iconY - 4, width / 2 + 8 * scale + 4, iconY + 16 * scale + 4, 0x33000000 | glow);
                item(g, reward, width / 2 - 8 * scale, iconY, scale);
                g.drawCenteredString(font, reward.getHoverName(), width / 2, y + (h < 220 ? 98 : 153), tierColor());
                g.drawCenteredString(font, "보상은 이미 지급됐어요.", width / 2, y + (h < 220 ? 112 : 171), 0xffb7ccbd);
            } else {
                double progress = timeline.progress(now);
                if (tier.equals("poop")) {
                    for (int i = 0; i < 18; i++) {
                        double angle = i * Math.PI / 9 + progress * 1.3;
                        int px = width / 2 + (int)(Math.cos(angle) * 77), py = y + (h < 220 ? 82 : 115) + (int)(Math.sin(angle) * (h < 220 ? 25 : 51));
                        g.fill(px, py, px + 3, py + 9, 0x99ffd45b);
                    }
                    g.drawCenteredString(font, "엄청난 기운이 느껴진다…", width / 2, y + (h < 220 ? 56 : 63), 0xffffd66a);
                    item(g, icons.get(0), width / 2 - 16, y + (h < 220 ? 69 : 91), 2);
                    g.fill(width / 2 - (h < 220 ? 19 : 27), y + (h < 220 ? 65 : 88), width / 2 + (h < 220 ? 19 : 27), y + (h < 220 ? 103 : 141), 0xdde8ba46);
                    g.drawCenteredString(font, "?", width / 2, y + (h < 220 ? 80 : 109), 0xffffffff);
                } else {
                    g.enableScissor(x + 12, y + (h < 220 ? 58 : 79), x + w - 12, y + (h < 220 ? 105 : 148));
                    double distance = Math.pow(1 - progress, 3) * 1000;
                    for (int i = -5; i <= 5; i++) {
                        int index = Math.floorMod(i + (int)(distance / 48), icons.size());
                        int px = width / 2 - 16 + i * 48 + (int)(distance % 48);
                        item(g, icons.get(index), px, y + (h < 220 ? 67 : 93), 2);
                    }
                    g.disableScissor(); g.fill(width / 2 - 1, y + (h < 220 ? 56 : 81), width / 2 + 1, y + (h < 220 ? 62 : 87), 0xfff7cf74);
                }
                g.drawCenteredString(font, "클릭하면 바로 결과를 볼 수 있어요.", width / 2, y + (h < 220 ? 111 : 173), 0xffaebfae);
            }
            status(g); super.render(g, mx, my, partial);
            if (result && !showChances && mx >= width/2-32 && mx < width/2+32 && my >= y+(h < 220 ? 58 : 78) && my < y+(h < 220 ? 90 : 142)) g.renderTooltip(font, reward, mx, my);
        }
        @Override public boolean mouseScrolled(double mx, double my, double delta) { if (showChances) { chanceOffset -= (int)Math.signum(delta); return true; } return super.mouseScrolled(mx, my, delta); }
        private void item(GuiGraphics g, ItemStack stack, int left, int top, int scale) {
            g.pose().pushPose(); g.pose().translate(left, top, 0); g.pose().scale(scale, scale, 1); g.renderItem(stack, 0, 0); g.pose().popPose();
        }
        @Override public void onClose() { timeline.close(); CoreNetwork.act("close", timeline.transaction(), "", "", ""); super.onClose(); }
        @Override void error(String message) { super.error(message); timeline.setAuto(false); waiting = false; if (autoButton != null) autoButton.setMessage(Component.literal("연속 OFF")); }
    }
    private static final class ProfileScreen extends Panel {
        final UUID token;
        private final boolean titleMode;
        private final String account;
        private final int defaultNameColor;
        private final JsonObject profile;
        private EditBox text;
        private String style, color;
        private Button save;
        ProfileScreen(CompoundTag data) {
            super(data.getString("kind").equals("title") ? "칭호권" : "닉네임 색상 변경권");
            token = data.getUUID("token"); titleMode = data.getString("kind").equals("title"); account = data.getString("account"); defaultNameColor = data.contains("defaultNameColor") ? data.getInt("defaultNameColor") : 0xffffff; profile = JsonParser.parseString(data.getString("profile")).getAsJsonObject();
            style = profile.get("titleStyle").getAsString(); color = profile.get(titleMode ? "titleColor" : "nameColor").getAsString();
        }
        @Override protected void init() {
            super.init();
            if (titleMode) {
                text = new EditBox(font, x + 20, y + (h < 220 ? 43 : 55), w - 40, h < 220 ? 18 : 20, Component.literal("칭호")); text.setMaxLength(64); text.setValue(profile.get("titleText").getAsString());
                addRenderableWidget(text); setInitialFocus(text);
                String[] styles = {"square", "angle", "corner"};
                for (int i = 0; i < styles.length; i++) { String value = styles[i]; button(ProfileRules.wrap("칭호", value), x + 20 + i * ((w - 40) / 3), y + (h < 220 ? 65 : 82), (w - 48) / 3, () -> style = value); }
            }
            int columns = h < 220 ? 16 : 8;
            int i = 0, cell = Math.min(35, (w - 40) / columns), left = x + (w - cell * columns) / 2;
            for (String value : ProfileRules.COLORS.keySet()) {
                Button b = button("■", left + i % columns * cell, y + (h < 220 ? 87 : 109) + i / columns * 21, cell - 3, () -> color = value);
                b.setFGColor(0xff000000 | ProfileRules.color(value)); i++;
            }
            save = button("적용하기 · 1개 사용", x + 20, y + h - 30, w - 124, () -> {
                try { if (titleMode) ProfileRules.validateTitle(text.getValue()); save.active = false; CoreNetwork.act(titleMode ? "title" : "color", token, titleMode ? text.getValue() : "", style, color); }
                catch (IllegalArgumentException invalid) { error(invalid.getMessage()); }
            });
            button("취소", x + w - 96, y + h - 30, 76, this::onClose);
        }
        @Override public void render(GuiGraphics g, int mx, int my, float partial) {
            panel(g);
            if (titleMode) { String normalized = java.text.Normalizer.normalize(text.getValue(), java.text.Normalizer.Form.NFC); int length = normalized.codePointCount(0, normalized.length()); g.drawString(font, "칭호 1~10글자 · 괄호 제외 (" + length + "/10)", x + 20, y + (h < 220 ? 33 : 41), 0xffcfddcc); }
            else g.drawCenteredString(font, "원래 Minecraft 이름의 색상만 바꿔요.", width / 2, y + (h < 220 ? 48 : 60), 0xffcfddcc);
            String titleText = titleMode ? text.getValue() : profile.get("titleText").getAsString();
            String preview = (titleText.isEmpty() ? "" : ProfileRules.wrap(titleText, style) + " ") + account;
            if (h >= 220) g.drawCenteredString(font, "미리보기", width / 2, y + h - 64, 0xffaebfae);
            int titleWidth = font.width(titleText.isEmpty() ? "" : ProfileRules.wrap(titleText, style) + " "); int left = (width - font.width(preview)) / 2;
            if (!titleText.isEmpty()) g.drawString(font, ProfileRules.wrap(titleText, style) + " ", left, y + (h < 220 ? 112 : h - 50), 0xff000000 | ProfileRules.color(titleMode ? color : profile.get("titleColor").getAsString()));
            g.drawString(font, account, left + titleWidth, y + (h < 220 ? 112 : h - 50), 0xff000000 | (titleMode && profile.has("hasNameColor") && !profile.get("hasNameColor").getAsBoolean() ? defaultNameColor : ProfileRules.color(titleMode ? profile.get("nameColor").getAsString() : color)));
            status(g); super.render(g, mx, my, partial);
        }
        @Override public void onClose() { CoreNetwork.act("close", token, "", "", ""); super.onClose(); }
        @Override void error(String message) { super.error(message); if (save != null) save.active = true; }
    }
    private static final class AdminScreen extends Panel {
        private final UUID token; private final boolean op; private final String mode;
        AdminScreen(CompoundTag data) { super("선린밸리 관리자"); token = data.getUUID("token"); op = data.getBoolean("op"); mode = data.getString("mode"); }
        @Override protected void init() {
            super.init(); button("OP " + (op ? "끄기" : "켜기"), x + 30, y + (h < 220 ? 61 : 75), w - 60, () -> CoreNetwork.act("op", token, op ? "off" : "on", "", ""));
            String[] modes = {"survival", "creative", "spectator"}; String[] labels = {"서바이벌", "크리에이티브", "관전자"};
            for (int i = 0; i < modes.length; i++) { String value = modes[i]; button(labels[i], x + 30 + (h < 220 ? i * (w - 60) / 3 : 0), y + (h < 220 ? 88 : 105 + i * 26), h < 220 ? (w - 66) / 3 : w - 60, () -> CoreNetwork.act("mode", token, value, "", "")); }
            button("닫기", x + 30, y + h - 30, w - 60, this::onClose);
        }
        @Override public void render(GuiGraphics g, int mx, int my, float partial) { panel(g); g.drawCenteredString(font, "현재 게임 모드: " + mode, width / 2, y + (h < 220 ? 43 : 48), 0xffcfddcc); status(g); super.render(g, mx, my, partial); }
        @Override public void onClose() { CoreNetwork.act("close", token, "", "", ""); super.onClose(); }
    }
}
