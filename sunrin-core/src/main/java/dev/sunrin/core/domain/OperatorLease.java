package dev.sunrin.core.domain;

/** The operator metadata owned by a temporary, explicitly requested lease. */
public final class OperatorLease {
    private OperatorLease() {}
    public record Entry(boolean present, int level, boolean bypassesPlayerLimit) {
        public Entry {
            if (!present && (level != 0 || bypassesPlayerLimit))
                throw new IllegalArgumentException("Absent OP cannot have metadata");
        }
        public static Entry absent() { return new Entry(false, 0, false); }
        public static Entry op(int level, boolean bypass) { return new Entry(true, level, bypass); }
    }
    public record Receipt(Entry original, Entry applied, Entry pending) {
        public Receipt {
            if (original == null || applied == null) throw new IllegalArgumentException("Missing OP state");
        }
    }
    public static Receipt prepare(Receipt previous, Entry current, Entry target) {
        if (previous != null && !current.equals(previous.applied()) && !current.equals(previous.pending()))
            throw new IllegalStateException("OP state changed outside the temporary lease");
        return new Receipt(previous == null ? current : previous.original(), current, target);
    }
    public static Receipt requested(Receipt previous, Entry current, boolean enabled, Entry grant) {
        Entry original = previous == null ? current : previous.original();
        Entry target = !enabled ? Entry.absent() : current.present() ? current : original.present() ? original : grant;
        return prepare(previous, current, target);
    }
    public static Entry restore(Receipt receipt, Entry current) {
        return (current.equals(receipt.applied()) || current.equals(receipt.pending())) ? receipt.original() : current;
    }
}
