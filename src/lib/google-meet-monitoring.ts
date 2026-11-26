import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.readonly";
const TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

type GoogleTokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
type SignJwtResponse = { signedJwt?: string };

export type MeetConferenceRecord = {
  name: string;
  startTime: string;
  endTime?: string;
  expireTime?: string;
  space: string;
};

export type MeetParticipant = {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: { user?: string; displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

type CachedToken = { token: string; expiresAt: number };
const globalForGoogle = globalThis as typeof globalThis & { _leadGoogleMeetToken?: CachedToken };

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

function getExternalAccountClient() {
  const projectNumber = requiredEnv("GCP_PROJECT_NUMBER");
  const poolId = requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = requiredEnv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccountEmail = requiredEnv("GCP_SERVICE_ACCOUNT_EMAIL");

  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() }
  });
  if (!client) throw new Error("Could not initialize Google workload identity authentication");
  return client;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } | string; error_description?: string };
      detail = typeof parsed.error === "string" ? parsed.error : parsed.error?.message || parsed.error_description || body;
    } catch {}
    throw new Error(`Google API request failed (${response.status}): ${detail}`);
  }
  return (body ? JSON.parse(body) : {}) as T;
}

async function getDelegatedAccessToken() {
  const cached = globalForGoogle._leadGoogleMeetToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const serviceAccountEmail = requiredEnv("GCP_SERVICE_ACCOUNT_EMAIL");
  const delegatedUser = requiredEnv("GOOGLE_WORKSPACE_DELEGATED_USER");
  const cloudClient = getExternalAccountClient();
  const cloudTokenResult = await cloudClient.getAccessToken();
  const cloudToken = typeof cloudTokenResult === "string" ? cloudTokenResult : cloudTokenResult?.token;
  if (!cloudToken) throw new Error("Google Cloud did not return an impersonated access token");

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    iss: serviceAccountEmail,
    sub: delegatedUser,
    scope: MEET_SCOPE,
    aud: TOKEN_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + 3600
  });
  const signResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccountEmail)}:signJwt`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cloudToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
      cache: "no-store"
    }
  );
  const signed = await readJson<SignJwtResponse>(signResponse);
  if (!signed.signedJwt) throw new Error("Google IAM did not return a signed delegated token");

  const tokenResponse = await fetch(TOKEN_AUDIENCE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signed.signedJwt }),
    cache: "no-store"
  });
  const delegated = await readJson<GoogleTokenResponse>(tokenResponse);
  if (!delegated.access_token) throw new Error(delegated.error_description || delegated.error || "Google Workspace did not return an access token");

  globalForGoogle._leadGoogleMeetToken = {
    token: delegated.access_token,
    expiresAt: Date.now() + Math.max(300, delegated.expires_in || 3600) * 1000
  };
  return delegated.access_token;
}

async function meetGet<T>(path: string, params?: Record<string, string>) {
  const url = new URL(`https://meet.googleapis.com/v2/${path}`);
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);
  const token = await getDelegatedAccessToken();
  return readJson<T>(await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }));
}

export function getMeetingCode(link: string) {
  const match = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#]|$)/i.exec(link.trim());
  return match?.[1]?.toLowerCase() || "";
}

export async function listConferenceRecords(meetingCode: string, since: Date) {
  const records: MeetConferenceRecord[] = [];
  let pageToken = "";
  do {
    const response = await meetGet<{ conferenceRecords?: MeetConferenceRecord[]; nextPageToken?: string }>("conferenceRecords", {
      pageSize: "100",
      filter: `space.meeting_code = "${meetingCode}" AND start_time >= "${since.toISOString()}"`,
      ...(pageToken ? { pageToken } : {})
    });
    records.push(...(response.conferenceRecords || []));
    pageToken = response.nextPageToken || "";
  } while (pageToken);
  return records;
}

export async function listConferenceParticipants(conferenceRecordName: string) {
  const participants: MeetParticipant[] = [];
  let pageToken = "";
  do {
    const response = await meetGet<{ participants?: MeetParticipant[]; nextPageToken?: string }>(`${conferenceRecordName}/participants`, {
      pageSize: "250",
      ...(pageToken ? { pageToken } : {})
    });
    participants.push(...(response.participants || []));
    pageToken = response.nextPageToken || "";
  } while (pageToken);
  return participants;
}

export function getMeetMonitoringCollectionName() {
  return process.env.MONGODB_MEET_MONITORING_COLLECTION || "meet_monitoring_records";
}
