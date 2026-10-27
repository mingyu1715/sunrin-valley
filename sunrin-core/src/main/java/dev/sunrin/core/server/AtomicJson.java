package dev.sunrin.core.server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import static java.nio.file.StandardOpenOption.*;

/** Keep the last valid file if serialization or replacement fails. */
public final class AtomicJson {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().serializeNulls().create();
    private AtomicJson() {}
    public static JsonObject read(Path path) throws IOException {
        if (!Files.exists(path)) return new JsonObject();
        if (Files.isSymbolicLink(path)) throw new IOException("Linked state path rejected");
        try { return JsonParser.parseString(Files.readString(path)).getAsJsonObject(); }
        catch (RuntimeException bad) { throw new IOException("Invalid state file: " + path.getFileName(), bad); }
    }
    public static void write(Path path, JsonObject data) throws IOException {
        Files.createDirectories(path.getParent());
        if (Files.isSymbolicLink(path) || Files.isSymbolicLink(path.getParent())) throw new IOException("Linked state path rejected");
        Path temporary = Files.createTempFile(path.getParent(), ".sunrin-", ".json.tmp");
        try {
            byte[] bytes = (GSON.toJson(data) + "\n").getBytes(StandardCharsets.UTF_8);
            try (FileChannel channel = FileChannel.open(temporary, WRITE, TRUNCATE_EXISTING)) {
                ByteBuffer buffer = ByteBuffer.wrap(bytes);
                while (buffer.hasRemaining()) channel.write(buffer);
                channel.force(true);
            }
            // No non-atomic fallback: a failed replacement leaves the old file intact.
            Files.move(temporary, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally { Files.deleteIfExists(temporary); }
    }
}
