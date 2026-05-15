import { describe, it, expect, beforeEach } from "bun:test";
import plugin from "../../src/index";
import { createMockPluginContext } from "../helpers/mock-plugin-context";
import { clearAllTokens } from "../../src/services/token-service";
import { clearAllStreams } from "../../src/services/stream-manager";

describe("commands", () => {
  let ctx: ReturnType<typeof createMockPluginContext>;
  let registeredCommands: Map<string, { executes: (invokerCtx: any, args: any) => Promise<any> }>;

  beforeEach(() => {
    clearAllTokens();
    clearAllStreams();
    registeredCommands = new Map();

    ctx = createMockPluginContext();
    ctx.commands.register = (def: { name: string; executes: (invokerCtx: any, args: any) => Promise<any> }) => {
      registeredCommands.set(def.name, def);
    };

    const config = plugin(ctx);
    config.onLoad();
  });

  describe("stream-start", () => {
    it("should reject when user is not in a voice channel", async () => {
      const cmd = registeredCommands.get("stream-start")!;
      const result = await cmd.executes({ userId: "user-1", currentVoiceChannelId: null }, []);
      expect(result.text).toContain("must be in a voice channel");
    });

    it("should return RTMP URL when user is in a voice channel", async () => {
      const cmd = registeredCommands.get("stream-start")!;
      const result = await cmd.executes({ userId: "user-1", currentVoiceChannelId: "ch-1" }, []);
      expect(result.text).toContain("rtmp://");
      expect(result.text).toContain("Stream started");
    });
  });

  describe("stream-stop", () => {
    it("should reject when user has no active stream", async () => {
      const cmd = registeredCommands.get("stream-stop")!;
      const result = await cmd.executes({ userId: "user-1" }, []);
      expect(result.text).toContain("don't have an active stream");
    });

    it("should stop an active stream", async () => {
      const startCmd = registeredCommands.get("stream-start")!;
      await startCmd.executes({ userId: "user-1", currentVoiceChannelId: "ch-1" }, []);

      const stopCmd = registeredCommands.get("stream-stop")!;
      const result = await stopCmd.executes({ userId: "user-1" }, []);
      expect(result.text).toContain("Stream stopped");
    });
  });

  describe("stream-info", () => {
    it("should reject when user is not in a voice channel", async () => {
      const cmd = registeredCommands.get("stream-info")!;
      const result = await cmd.executes({ userId: "user-1", currentVoiceChannelId: null }, []);
      expect(result.text).toContain("must be in a voice channel");
    });

    it("should show active streams", async () => {
      const startCmd = registeredCommands.get("stream-start")!;
      await startCmd.executes({ userId: "user-1", currentVoiceChannelId: "ch-1" }, []);

      const infoCmd = registeredCommands.get("stream-info")!;
      const result = await infoCmd.executes({ userId: "user-2", currentVoiceChannelId: "ch-1" }, []);
      expect(result.text).toContain("Active streams");
      expect(result.text).toContain("user-1");
    });
  });
});
