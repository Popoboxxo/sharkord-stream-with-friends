import { PluginContext } from "@sharkord/plugin-sdk";
import { revokeToken } from "../services/token-service";
import { stopStream, getUserStream } from "../services/stream-manager";

export function registerStreamStopCommand(ctx: PluginContext): void {
  ctx.commands.register({
    name: "stream-stop",
    description: "Stop your active stream.",
    args: [],
    async executes(invokerCtx, _args) {
      const userId = invokerCtx.userId;

      const stream = getUserStream(userId);
      if (!stream) {
        return { text: "You don't have an active stream." };
      }

      stopStream(userId);
      revokeToken(userId);

      ctx.log(`Stream stopped by ${userId}`);
      return { text: "🔴 Stream stopped." };
    },
  });
}
