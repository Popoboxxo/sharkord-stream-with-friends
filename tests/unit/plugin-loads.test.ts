import { describe, it, expect } from "bun:test";
import plugin from "../../src/index.ts";
import { createMockPluginContext } from "../helpers/mock-plugin-context.ts";

describe("sharkord-stream-with-friends", () => {
  it("should export a valid plugin function", () => {
    expect(typeof plugin).toBe("function");
  });

  it("should return a PluginConfig object", () => {
    const ctx = createMockPluginContext();
    const config = plugin(ctx);
    expect(config.name).toBe("sharkord-stream-with-friends");
    expect(config.version).toBe("0.1.0-alpha.1");
    expect(typeof config.onLoad).toBe("function");
    expect(typeof config.onUnload).toBe("function");
  });
});
