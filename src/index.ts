import { PluginConfig, PluginContext } from "@sharkord/plugin-sdk";
import { registerStreamStartCommand } from "./commands/stream-start";
import { registerStreamStopCommand } from "./commands/stream-stop";
import { registerStreamInfoCommand } from "./commands/stream-info";
import { clearAllTokens } from "./services/token-service";
import { clearAllStreams } from "./services/stream-manager";
import { PLUGIN_NAME, VERSION, RTMP_PORT } from "./utils/constants";

export default function plugin(context: PluginContext): PluginConfig {
  const serverIp = process.env.RTMP_HOST || "127.0.0.1";

  context.log(`${PLUGIN_NAME} v${VERSION} initializing`);

  return {
    name: PLUGIN_NAME,
    version: VERSION,
    onLoad() {
      registerStreamStartCommand(context, serverIp);
      registerStreamStopCommand(context);
      registerStreamInfoCommand(context);
      context.log(`${PLUGIN_NAME} commands registered`);
    },
    onUnload() {
      clearAllTokens();
      clearAllStreams();
      context.log(`${PLUGIN_NAME} cleaned up`);
    },
  };
}
