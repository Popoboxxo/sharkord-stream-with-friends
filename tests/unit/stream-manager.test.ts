import { describe, it, expect, beforeEach } from "bun:test";
import {
  startStream,
  stopStream,
  getActiveStreams,
  getStreamInfo,
  getUserStream,
  incrementViewer,
  clearAllStreams,
} from "../../src/services/stream-manager";

describe("stream-manager", () => {
  beforeEach(() => {
    clearAllStreams();
  });

  describe("startStream", () => {
    it("should register a stream for a user in a channel", () => {
      startStream("user-1", "channel-1", "token-abc");
      const streams = getActiveStreams("channel-1");
      expect(streams.length).toBe(1);
      expect(streams[0].userId).toBe("user-1");
      expect(streams[0].token).toBe("token-abc");
    });

    it("should allow multiple streams in the same channel", () => {
      startStream("user-1", "channel-1", "token-1");
      startStream("user-2", "channel-1", "token-2");
      const streams = getActiveStreams("channel-1");
      expect(streams.length).toBe(2);
    });

    it("should isolate streams between channels", () => {
      startStream("user-1", "channel-1", "token-1");
      startStream("user-2", "channel-2", "token-2");
      expect(getActiveStreams("channel-1").length).toBe(1);
      expect(getActiveStreams("channel-2").length).toBe(1);
      expect(getActiveStreams("channel-1")[0].userId).toBe("user-1");
      expect(getActiveStreams("channel-2")[0].userId).toBe("user-2");
    });
  });

  describe("stopStream", () => {
    it("should remove a users stream", () => {
      startStream("user-1", "channel-1", "token-1");
      stopStream("user-1");
      expect(getActiveStreams("channel-1").length).toBe(0);
    });

    it("should not affect other users streams", () => {
      startStream("user-1", "channel-1", "token-1");
      startStream("user-2", "channel-1", "token-2");
      stopStream("user-1");
      const streams = getActiveStreams("channel-1");
      expect(streams.length).toBe(1);
      expect(streams[0].userId).toBe("user-2");
    });

    it("should be idempotent for unknown user", () => {
      expect(() => stopStream("unknown")).not.toThrow();
    });
  });

  describe("getActiveStreams", () => {
    it("should return empty array for channel without streams", () => {
      expect(getActiveStreams("empty-channel")).toEqual([]);
    });

    it("should return all streams in a channel", () => {
      startStream("user-1", "channel-1", "token-1");
      startStream("user-2", "channel-1", "token-2");
      const streams = getActiveStreams("channel-1");
      expect(streams.map((s) => s.userId)).toContain("user-1");
      expect(streams.map((s) => s.userId)).toContain("user-2");
    });
  });

  describe("getStreamInfo", () => {
    it("should return no-stream message for empty channel", () => {
      const info = getStreamInfo("empty-channel");
      expect(info).toContain("No active streams");
    });

    it("should return formatted info for active streams", () => {
      startStream("user-1", "channel-1", "token-1");
      const info = getStreamInfo("channel-1");
      expect(info).toContain("Active streams");
      expect(info).toContain("user-1");
    });
  });

  describe("getUserStream", () => {
    it("should return null for user without stream", () => {
      expect(getUserStream("unknown")).toBeNull();
    });

    it("should return stream state for streaming user", () => {
      startStream("user-1", "channel-1", "token-1");
      const stream = getUserStream("user-1");
      expect(stream).not.toBeNull();
      expect(stream!.channelId).toBe("channel-1");
    });
  });

  describe("incrementViewer", () => {
    it("should increase viewer count", () => {
      startStream("user-1", "channel-1", "token-1");
      incrementViewer("user-1");
      incrementViewer("user-1");
      const stream = getUserStream("user-1");
      expect(stream!.viewerCount).toBe(2);
    });

    it("should not throw for unknown user", () => {
      expect(() => incrementViewer("unknown")).not.toThrow();
    });
  });
});
