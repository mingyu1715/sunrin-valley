package dev.sunrin.core.domain;

import java.util.Objects;
import static dev.sunrin.core.domain.OperatorLease.*;

/** Real transition tests: a lost original or ignored external edit must fail these. */
public final class OperatorLeaseTests {
    private static int checks;
    private static void eq(Object expected, Object actual) {
        checks++;
        if (!Objects.equals(expected, actual)) throw new AssertionError(expected + " != " + actual);
    }
    private static void rejects(Runnable action) {
        checks++;
        try { action.run(); } catch (IllegalArgumentException | IllegalStateException expected) { return; }
        throw new AssertionError("External state must be rejected before replacing its receipt");
    }
    public static void run() {
        Entry original = Entry.op(2, true);
        eq(original, restore(new Receipt(original, Entry.absent(), null), Entry.absent()));
        Entry granted = Entry.op(4, false);
        eq(Entry.absent(), restore(new Receipt(Entry.absent(), granted, null), granted));
        eq(original, restore(new Receipt(original, Entry.absent(), original), original));
        // Pending receipt survives a crash immediately before OR after native mutation.
        Receipt pendingOff = new Receipt(Entry.absent(), granted, Entry.absent());
        eq(Entry.absent(), restore(pendingOff, granted));
        eq(Entry.absent(), restore(pendingOff, Entry.absent()));
        Receipt pendingOn = new Receipt(original, Entry.absent(), granted);
        eq(original, restore(pendingOn, granted));
        eq(original, restore(pendingOn, Entry.absent()));
        // Cleanup cannot overwrite a later external status, level, or bypass edit.
        eq(Entry.absent(), restore(new Receipt(original, granted, null), Entry.absent()));
        eq(Entry.op(3, false), restore(new Receipt(original, granted, null), Entry.op(3, false)));
        eq(Entry.op(4, true), restore(new Receipt(original, granted, null), Entry.op(4, true)));
        eq(original, restore(new Receipt(original, original, null), original));
        eq(Entry.absent(), restore(new Receipt(Entry.absent(), granted, null), Entry.absent()));
        Receipt off = prepare(null, original, Entry.absent());
        Receipt on = prepare(off, Entry.absent(), original);
        eq(original, on.original());
        eq(Entry.absent(), on.applied());
        eq(original, on.pending());
        eq(original, restore(on, original));
        Receipt firstOn = prepare(null, Entry.absent(), granted);
        Receipt nextOff = prepare(firstOn, granted, Entry.absent());
        eq(Entry.absent(), nextOff.original());
        eq(Entry.absent(), restore(nextOff, granted));
        Receipt requestedOff = requested(null, original, false, granted);
        eq(Entry.absent(), requestedOff.pending());
        Receipt requestedOn = requested(requestedOff, Entry.absent(), true, granted);
        eq(original, requestedOn.pending());
        eq(original, requested(null, original, true, granted).pending());
        eq(granted, requested(null, Entry.absent(), true, granted).pending());
        rejects(() -> prepare(new Receipt(original, granted, null), Entry.op(3, false), Entry.absent()));
        rejects(() -> prepare(new Receipt(original, granted, null), Entry.op(4, true), Entry.absent()));
        rejects(() -> prepare(new Receipt(original, granted, null), Entry.absent(), granted));
        rejects(() -> new Entry(false, 3, false));
        rejects(() -> new Entry(false, 0, true));
        rejects(() -> new Receipt(null, granted, null));
        rejects(() -> new Receipt(original, null, null));
        System.out.println("Operator lease tests passed: " + checks + " checks");
    }
    public static void main(String[] args) { run(); }
}
