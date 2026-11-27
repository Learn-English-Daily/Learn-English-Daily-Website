"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClassSessionsCollectionName, type ClassSessionDocument } from "@/lib/class-sessions";
import { getBatchClassSessionsCollectionName, type BatchClassSessionDocument } from "@/lib/batch-class-sessions";
import { getBatchesCollectionName } from "@/lib/assessments";
import { CEO_SESSION_COOKIE, isValidCeoSession } from "@/lib/ceo-auth";
import { getBatchMeetLink, getMeetingCode, getMeetMonitoringCollectionName, listConferenceParticipants, listConferenceRecordings, listConferenceRecords, type MeetConferenceRecord, type MeetParticipant, type MeetRecording } from "@/lib/google-meet-monitoring";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

type MeetStudent = { studentId?: string; studentName?: string; permanentMeetLink?: string };
type StudentCode = { studentId: string; studentName: string; meetingCode: string };
type Call = { record: MeetConferenceRecord; participantNames: string[]; participants: MeetParticipant[]; recordings: MeetRecording[] };
type SessionWithId = ClassSessionDocument & { _id?: { toString(): string } };
type MeetBatch = { _id?: { toString(): string }; batchName?: string; permanentMeetLink?: string };
type BatchCode = { batchId: string; batchName: string; meetingCode: string };
type BatchSessionWithId = BatchClassSessionDocument & { _id?: { toString(): string } };

const MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;
const UNMATCHED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function messageUrl(kind: "success" | "error", message: string) {
  return `/ceo/meet-monitoring?${kind}=${encodeURIComponent(message)}`;
}

function uniqueNames(names: string[]) {
  return [...new Map(names.filter(Boolean).map((name) => [name.trim().toLocaleLowerCase(), name.trim()])).values()];
}

function durationMinutes(record: MeetConferenceRecord) {
  if (!record.endTime) return null;
  return Math.max(0, Math.round((new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60_000));
}

function recordingDurationMinutes(recording: MeetRecording) {
  if (!recording.startTime || !recording.endTime) return null;
  return Math.max(0, Math.round((new Date(recording.endTime).getTime() - new Date(recording.startTime).getTime()) / 60_000));
}

function recordingSummary(calls: Call[]) {
  const recordings = calls.flatMap((call) => call.recordings).sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
  const active = recordings.some((recording) => recording.state === "STARTED" || !recording.endTime);
  const segments = recordings.map((recording) => ({
    recordingName: recording.name,
    startTime: recording.startTime || "",
    endTime: recording.endTime || "",
    state: recording.state || "STATE_UNSPECIFIED",
    durationMinutes: recordingDurationMinutes(recording),
    exportUri: recording.driveDestination?.exportUri || ""
  }));
  const completedEnds = recordings.flatMap((recording) => recording.endTime ? [new Date(recording.endTime).getTime()] : []);
  const allReady = recordings.length > 0 && recordings.every((recording) => recording.state === "FILE_GENERATED");
  const processing = recordings.some((recording) => recording.state === "ENDED");
  return {
    recordingCount: recordings.length,
    recordingStartedAt: recordings[0]?.startTime || "",
    recordingEndedAt: active || !completedEnds.length ? "" : new Date(Math.max(...completedEnds)).toISOString(),
    recordingDurationMinutes: recordings.reduce((sum, recording) => sum + (recordingDurationMinutes(recording) || 0), 0),
    recordingStatus: !recordings.length ? "Not recorded" : active ? "Recording" : allReady ? "Ready" : processing ? "Processing" : "Stopped",
    recordingWasInterrupted: recordings.length > 1,
    recordingRestartCount: Math.max(0, recordings.length - 1),
    recordingSegments: segments
  };
}

function participantSummary(calls: Call[]) {
  const entries = calls.flatMap((call) => call.participants.map((participant) => ({
    name: participant.signedinUser?.displayName || participant.anonymousUser?.displayName || participant.phoneUser?.displayName || "Unknown participant",
    joinedAt: participant.earliestStartTime || "",
    leftAt: participant.latestEndTime || ""
  })));
  const combined = new Map<string, { name: string; joinedAt: string; leftAt: string }>();
  for (const entry of entries) {
    const key = entry.name.trim().toLocaleLowerCase();
    const existing = combined.get(key);
    if (!existing) { combined.set(key, entry); continue; }
    const joined = [existing.joinedAt, entry.joinedAt].filter(Boolean).sort()[0] || "";
    const left = [existing.leftAt, entry.leftAt].filter(Boolean).sort().at(-1) || "";
    combined.set(key, { name: existing.name, joinedAt: joined, leftAt: left });
  }
  return [...combined.values()].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

function matchSession(record: MeetConferenceRecord, studentId: string, sessions: SessionWithId[]) {
  const start = new Date(record.startTime).getTime();
  return sessions.filter((session) => session.studentId === studentId && session.scheduledAt)
    .map((session) => ({ session, distance: Math.abs(new Date(session.scheduledAt || "").getTime() - start) }))
    .filter(({ distance }) => Number.isFinite(distance) && distance <= MATCH_WINDOW_MS)
    .sort((a, b) => a.distance - b.distance)[0]?.session;
}

function classSummary(student: StudentCode, session: SessionWithId, calls: Call[]) {
  const starts = calls.map(({ record }) => new Date(record.startTime).getTime());
  const ends = calls.flatMap(({ record }) => record.endTime ? [new Date(record.endTime).getTime()] : []);
  const actualStart = Math.min(...starts);
  const active = calls.some(({ record }) => !record.endTime);
  const actualEnd = active || !ends.length ? NaN : Math.max(...ends);
  const scheduledStart = new Date(session.scheduledAt || "").getTime();
  const scheduledEnd = new Date(session.endsAt || "").getTime();
  return {
    recordVersion: 4, recordType: "scheduled_class", recordKey: `session:${session._id}`,
    conferenceRecordNames: calls.map(({ record }) => record.name), meetingCode: student.meetingCode,
    studentId: student.studentId, studentName: student.studentName, classSessionId: String(session._id || ""),
    meetingNumber: session.meetingNumber || null, sessionDate: session.sessionDate || "",
    scheduledStartAt: session.scheduledAt || "", scheduledEndAt: session.endsAt || "", teacherNames: session.teacherNames || [],
    actualStartAt: new Date(actualStart).toISOString(), actualEndAt: Number.isFinite(actualEnd) ? new Date(actualEnd).toISOString() : "",
    durationMinutes: active ? null : calls.reduce((sum, { record }) => sum + (durationMinutes(record) || 0), 0),
    startDifferenceMinutes: Number.isFinite(scheduledStart) ? Math.round((actualStart - scheduledStart) / 60_000) : null,
    endDifferenceMinutes: Number.isFinite(scheduledEnd) && Number.isFinite(actualEnd) ? Math.round((actualEnd - scheduledEnd) / 60_000) : null,
    participantNames: uniqueNames(calls.flatMap((call) => call.participantNames)), participantSessions: participantSummary(calls), status: active ? "In progress" : "Ended",
    ...recordingSummary(calls), syncedAt: new Date()
  };
}

function matchBatchSession(record: MeetConferenceRecord, batchId: string, sessions: BatchSessionWithId[]) {
  const start = new Date(record.startTime).getTime();
  return sessions.filter((session) => session.batchId === batchId)
    .map((session) => ({ session, distance: Math.abs(new Date(`${session.sessionDate}T${session.startTime}:00+07:00`).getTime() - start) }))
    .filter(({ distance }) => Number.isFinite(distance) && distance <= MATCH_WINDOW_MS)
    .sort((a, b) => a.distance - b.distance)[0]?.session;
}

function groupClassSummary(batch: BatchCode, session: BatchSessionWithId, calls: Call[]) {
  const starts = calls.map(({ record }) => new Date(record.startTime).getTime());
  const ends = calls.flatMap(({ record }) => record.endTime ? [new Date(record.endTime).getTime()] : []);
  const actualStart = Math.min(...starts);
  const active = calls.some(({ record }) => !record.endTime);
  const actualEnd = active || !ends.length ? NaN : Math.max(...ends);
  const scheduledStartAt = `${session.sessionDate}T${session.startTime}:00+07:00`;
  const scheduledEndAt = `${session.sessionDate}T${session.endTime}:00+07:00`;
  const scheduledStart = new Date(scheduledStartAt).getTime();
  const scheduledEnd = new Date(scheduledEndAt).getTime();
  return {
    recordVersion: 4, recordType: "scheduled_class", classKind: "group", recordKey: `batch-session:${session._id}`,
    conferenceRecordNames: calls.map(({ record }) => record.name), meetingCode: batch.meetingCode,
    batchId: batch.batchId, batchName: batch.batchName, classSessionId: String(session._id || ""),
    meetingNumber: session.meetingNumber || null, sessionDate: session.sessionDate || "",
    scheduledStartAt, scheduledEndAt, teacherNames: session.teacherName ? [session.teacherName] : [],
    actualStartAt: new Date(actualStart).toISOString(), actualEndAt: Number.isFinite(actualEnd) ? new Date(actualEnd).toISOString() : "",
    durationMinutes: active ? null : calls.reduce((sum, { record }) => sum + (durationMinutes(record) || 0), 0),
    startDifferenceMinutes: Math.round((actualStart - scheduledStart) / 60_000),
    endDifferenceMinutes: Number.isFinite(actualEnd) ? Math.round((actualEnd - scheduledEnd) / 60_000) : null,
    participantNames: uniqueNames(calls.flatMap((call) => call.participantNames)), participantSessions: participantSummary(calls), status: active ? "In progress" : "Ended",
    ...recordingSummary(calls), syncedAt: new Date()
  };
}

export async function syncMeetMonitoring() {
  if (!isValidCeoSession((await cookies()).get(CEO_SESSION_COOKIE)?.value)) throw new Error("Unauthorized");
  let synced = 0;
  try {
    const db = await getMongoDb();
    const students = await db.collection<MeetStudent>(getStudentRegistrationCollectionName()).find({ classType: "Premium 1-to-1", permanentMeetLink: { $type: "string", $ne: "" } }).project({ studentId: 1, studentName: 1, permanentMeetLink: 1 }).toArray();
    const batches = await db.collection<MeetBatch>(getBatchesCollectionName()).find({}).project({ batchName: 1, permanentMeetLink: 1 }).toArray();
    const codes: StudentCode[] = students.map((student) => ({ studentId: student.studentId || "", studentName: student.studentName || "Unknown student", meetingCode: getMeetingCode(student.permanentMeetLink || "") })).filter((student) => student.studentId && student.meetingCode);
    const batchCodes: BatchCode[] = batches.map((batch) => ({ batchId: String(batch._id || ""), batchName: batch.batchName || "Unknown batch", meetingCode: getMeetingCode(getBatchMeetLink(batch.batchName || "", batch.permanentMeetLink)) })).filter((batch) => batch.batchId && batch.meetingCode);
    const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const sessions = await db.collection<SessionWithId>(getClassSessionsCollectionName()).find({ studentId: { $in: codes.map(({ studentId }) => studentId) }, classMode: "Online", scheduledAt: { $gte: new Date(since.getTime() - 86_400_000).toISOString() } }).toArray();
    const batchSessions = await db.collection<BatchSessionWithId>(getBatchClassSessionsCollectionName()).find({ batchId: { $in: batchCodes.map(({ batchId }) => batchId) }, classMode: "Online", sessionDate: { $gte: since.toISOString().slice(0, 10) } }).toArray();
    const matched = new Map<string, { student: StudentCode; session: SessionWithId; calls: Call[] }>();
    const unmatched: { student: StudentCode; call: Call }[] = [];
    const matchedGroups = new Map<string, { batch: BatchCode; session: BatchSessionWithId; calls: Call[] }>();
    const unmatchedGroups: { batch: BatchCode; call: Call }[] = [];

    for (const student of codes) for (const record of await listConferenceRecords(student.meetingCode, since)) {
      const [participants, recordings] = await Promise.all([listConferenceParticipants(record.name), listConferenceRecordings(record.name)]);
      const call: Call = { record, recordings, participants, participantNames: uniqueNames(participants.map((participant) => participant.signedinUser?.displayName || participant.anonymousUser?.displayName || participant.phoneUser?.displayName || "")) };
      const duration = durationMinutes(record);
      if (!call.participantNames.length || (duration !== null && duration < 3)) continue;
      const session = matchSession(record, student.studentId, sessions);
      if (!session?._id) { unmatched.push({ student, call }); continue; }
      const key = String(session._id);
      const group = matched.get(key) || { student, session, calls: [] };
      group.calls.push(call); matched.set(key, group);
    }

    for (const batch of batchCodes) for (const record of await listConferenceRecords(batch.meetingCode, since)) {
      const [participants, recordings] = await Promise.all([listConferenceParticipants(record.name), listConferenceRecordings(record.name)]);
      const call: Call = { record, recordings, participants, participantNames: uniqueNames(participants.map((participant) => participant.signedinUser?.displayName || participant.anonymousUser?.displayName || participant.phoneUser?.displayName || "")) };
      const duration = durationMinutes(record);
      if (!call.participantNames.length || (duration !== null && duration < 3)) continue;
      const session = matchBatchSession(record, batch.batchId, batchSessions);
      if (!session?._id) { unmatchedGroups.push({ batch, call }); continue; }
      const key = String(session._id);
      const group = matchedGroups.get(key) || { batch, session, calls: [] };
      group.calls.push(call); matchedGroups.set(key, group);
    }

    const collection = db.collection(getMeetMonitoringCollectionName());
    await collection.createIndex({ recordKey: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    for (const group of matched.values()) {
      const summary = classSummary(group.student, group.session, group.calls);
      await collection.updateOne({ recordKey: summary.recordKey }, { $set: summary, $unset: { expiresAt: "", conferenceRecordName: "" } }, { upsert: true });
      synced++;
    }
    for (const group of matchedGroups.values()) {
      const summary = groupClassSummary(group.batch, group.session, group.calls);
      await collection.updateOne({ recordKey: summary.recordKey }, { $set: summary, $unset: { expiresAt: "", conferenceRecordName: "" } }, { upsert: true });
      synced++;
    }
    for (const { student, call } of unmatched) await collection.updateOne({ recordKey: `unmatched:${call.record.name}` }, { $set: {
      recordVersion: 4, recordType: "unmatched_call", recordKey: `unmatched:${call.record.name}`, conferenceRecordNames: [call.record.name],
      studentId: student.studentId, studentName: student.studentName, meetingCode: student.meetingCode,
      actualStartAt: call.record.startTime, actualEndAt: call.record.endTime || "", durationMinutes: durationMinutes(call.record),
      participantNames: call.participantNames, participantSessions: participantSummary([call]), status: call.record.endTime ? "Ended" : "In progress", ...recordingSummary([call]), syncedAt: new Date(),
      expiresAt: new Date(new Date(call.record.startTime).getTime() + UNMATCHED_RETENTION_MS)
    } }, { upsert: true });
    for (const { batch, call } of unmatchedGroups) await collection.updateOne({ recordKey: `unmatched:group:${call.record.name}` }, { $set: {
      recordVersion: 4, recordType: "unmatched_call", classKind: "group", recordKey: `unmatched:group:${call.record.name}`, conferenceRecordNames: [call.record.name],
      batchId: batch.batchId, batchName: batch.batchName, meetingCode: batch.meetingCode,
      actualStartAt: call.record.startTime, actualEndAt: call.record.endTime || "", durationMinutes: durationMinutes(call.record),
      participantNames: call.participantNames, participantSessions: participantSummary([call]), status: call.record.endTime ? "Ended" : "In progress", ...recordingSummary([call]), syncedAt: new Date(),
      expiresAt: new Date(new Date(call.record.startTime).getTime() + UNMATCHED_RETENTION_MS)
    } }, { upsert: true });
    await collection.deleteMany({ recordVersion: { $ne: 4 } });
    revalidatePath("/ceo/meet-monitoring");
  } catch (error) {
    redirect(messageUrl("error", error instanceof Error ? error.message : "Meet monitoring sync failed."));
  }
  redirect(messageUrl("success", `Synced ${synced} scheduled class summar${synced === 1 ? "y" : "ies"}.`));
}
