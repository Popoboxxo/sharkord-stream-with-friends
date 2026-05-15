import { PluginConfig, PluginContext } from "@sharkord/plugin-sdk";

export default function plugin(context: PluginContext): PluginConfig {
  context.log(`🔌 sharkord-stream-with-friends loaded`);

  return {
    name: "sharkord-stream-with-friends",
    version: "0.1.0-alpha.1",
    onLoad() {
      context.log("Plugin loaded");
    },
    onUnload() {
      context.log("Plugin unloaded");
    },
  };
}
