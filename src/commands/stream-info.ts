import { PluginContext } from "@sharkord/plugin-sdk";
import { getStreamInfo } from "../services/stream-manager";

export function registerStreamInfoCommand(ctx: PluginContext): void {
  ctx.commands.register({
    name: "stream-info",
    description: "Show active streams in the current channel.",
    args: [],
    async executes(invokerCtx, _args) {
      const channelId = invokerCtx.currentVoiceChannelId;

      if (!channelId) {
        return { text: "You must be in a voice channel to view stream info." };
      }

      const info = getStreamInfo(channelId);
      return { text: info };
    },
  });
}
