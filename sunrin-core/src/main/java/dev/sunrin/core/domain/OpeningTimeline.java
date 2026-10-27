package dev.sunrin.core.domain;

import java.util.UUID;

/** Visual timing only. The authoritative reward already exists on the server. */
public final class OpeningTimeline {
    private final UUID transaction;
    private final long start;
    private final long duration;
    private long revealTime;
    private boolean skipped, auto, requested, closed;
    public OpeningTimeline(UUID transaction, boolean prank, long now) {
        this.transaction = transaction; start = now; duration = prank ? 6_000_000_000L : 3_800_000_000L;
        revealTime = start + duration;
    }
    public UUID transaction() { return transaction; }
    public double progress(long now) { return skipped ? 1.0 : Math.max(0.0, Math.min(1.0, (now - start) / (double)duration)); }
    public boolean isResult(long now) { return skipped || now >= revealTime; }
    public void skip(long now) { if (!isResult(now)) { skipped = true; revealTime = now; } }
    public void setAuto(boolean value) { auto = value; }
    public boolean isAuto() { return auto && !closed; }
    public boolean claimNext(long now, int remaining) {
        if (remaining <= 0) { auto = false; return false; }
        if (!isAuto() || requested || !isResult(now) || now - revealTime < 800_000_000L || remaining <= 0) return false;
        requested = true; return true;
    }
    public void close() { closed = true; auto = false; }
}
