export interface Token {
  userId: string;
  channelId: string;
  token: string;
  createdAt: Date;
}

export interface StreamState {
  userId: string;
  channelId: string;
  token: string;
  startedAt: Date;
  viewerCount: number;
}

export interface PluginSettings {
  rtmpPort: number;
  rtmpPath: string;
  maxViewersPerStream: number;
}
