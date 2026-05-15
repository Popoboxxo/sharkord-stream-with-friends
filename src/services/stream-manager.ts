import { StreamState } from "../types";

const activeStreams = new Map<string, Map<string, StreamState>>();

export function startStream(userId: string, channelId: string, token: string): void {
  if (!activeStreams.has(channelId)) {
    activeStreams.set(channelId, new Map());
  }

  const channelStreams = activeStreams.get(channelId)!;
  channelStreams.set(userId, {
    userId,
    channelId,
    token,
    startedAt: new Date(),
    viewerCount: 0,
  });
}

export function stopStream(userId: string): void {
  for (const [channelId, streams] of activeStreams.entries()) {
    if (streams.has(userId)) {
      streams.delete(userId);
      if (streams.size === 0) {
        activeStreams.delete(channelId);
      }
      return;
    }
  }
}

export function getActiveStreams(channelId: string): StreamState[] {
  const channelStreams = activeStreams.get(channelId);
  if (!channelStreams) {
    return [];
  }
  return Array.from(channelStreams.values());
}

export function getStreamInfo(channelId: string): string {
  const streams = getActiveStreams(channelId);
  if (streams.length === 0) {
    return "No active streams in this channel.";
  }

  const lines = streams.map(
    (s) => `📺 ${s.userId} — ${s.viewerCount} viewer(s) — started ${s.startedAt.toLocaleTimeString()}`
  );
  return ["Active streams:", ...lines].join("\n");
}

export function getUserStream(userId: string): StreamState | null {
  for (const streams of activeStreams.values()) {
    if (streams.has(userId)) {
      return streams.get(userId) ?? null;
    }
  }
  return null;
}

export function incrementViewer(userId: string): void {
  const stream = getUserStream(userId);
  if (stream) {
    stream.viewerCount += 1;
  }
}

export function clearAllStreams(): void {
  activeStreams.clear();
}
