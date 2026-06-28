export type GameType = "speech-competition" | "escape-room";

export type GameSessionDocument = {
  token?: string;
  gameType?: GameType;
  classSessionId?: string;
  studentId?: string;
  studentName?: string;
  meetingNumber?: number;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export function getGameSessionsCollectionName() {
  return process.env.MONGODB_GAME_SESSIONS_COLLECTION || "game_sessions";
}

export function getGameSessionExpiry(createdAt = new Date()) {
  return new Date(createdAt.getTime() + 90 * 60 * 1000);
}

export function isGameSessionExpired(expiresAt?: Date | string) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function getPublicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.learn-english-daily.com").replace(/\/$/, "");
}

export function getGameSessionUrl(token: string) {
  return `${getPublicSiteUrl()}/games/session/${encodeURIComponent(token)}`;
}
