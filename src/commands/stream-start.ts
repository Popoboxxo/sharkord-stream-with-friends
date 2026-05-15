import { PluginContext } from "@sharkord/plugin-sdk";
import { generateToken, getUserToken } from "../services/token-service";
import { startStream, getUserStream } from "../services/stream-manager";
import { RTMP_PORT, RTMP_PATH } from "../utils/constants";

export function registerStreamStartCommand(ctx: PluginContext, serverIp: string): void {
  ctx.commands.register({
    name: "stream-start",
    description: "Start a stream in the current voice channel.",
    args: [],
    async executes(invokerCtx, _args) {
      const userId = invokerCtx.userId;
      const channelId = invokerCtx.currentVoiceChannelId;

      if (!channelId) {
        ctx.log(`User ${userId} tried to start stream without being in a voice channel`);
        return { text: "You must be in a voice channel to start a stream." };
      }

      const existingToken = getUserToken(userId);
      let token: string;

      if (existingToken) {
        token = existingToken.token;
      } else {
        token = generateToken(userId, channelId);
      }

      startStream(userId, channelId, token);

      const rtmpUrl = `rtmp://${serverIp}:${RTMP_PORT}${RTMP_PATH}/${token}`;
      ctx.log(`Stream started by ${userId} in channel ${channelId}`);

      return {
        text: `🔴 Stream started!\n\nRTMP URL: \`${rtmpUrl}\`\n\nPaste this URL into OBS (Settings → Stream → Custom).`,
      };
    },
  });
}
