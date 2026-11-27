"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClassSessionsCollectionName, type ClassSessionDocument } from "@/lib/class-sessions";
import { CEO_SESSION_COOKIE, isValidCeoSession } from "@/lib/ceo-auth";
import { getMeetingCode, getMeetMonitoringCollectionName, listConferenceParticipants, listConferenceRecordings, listConferenceRecords, type MeetConferenceRecord, type MeetRecording } from "@/lib/google-meet-monitoring";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

type MeetStudent = { studentId?: string; studentName?: string; permanentMeetLink?: string };
type StudentCode = { studentId: string; studentName: string; meetingCode: string };
type Call = { record: MeetConferenceRecord; participantNames: string[]; recordings: MeetRecording[] };
type SessionWithId = ClassSessionDocument & { _id?: { toString(): string } };

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
    recordVersion: 3, recordType: "scheduled_class", recordKey: `session:${session._id}`,
    conferenceRecordNames: calls.map(({ record }) => record.name), meetingCode: student.meetingCode,
    studentId: student.studentId, studentName: student.studentName, classSessionId: String(session._id || ""),
    meetingNumber: session.meetingNumber || null, sessionDate: session.sessionDate || "",
    scheduledStartAt: session.scheduledAt || "", scheduledEndAt: session.endsAt || "", teacherNames: session.teacherNames || [],
    actualStartAt: new Date(actualStart).toISOString(), actualEndAt: Number.isFinite(actualEnd) ? new Date(actualEnd).toISOString() : "",
    durationMinutes: active ? null : calls.reduce((sum, { record }) => sum + (durationMinutes(record) || 0), 0),
    startDifferenceMinutes: Number.isFinite(scheduledStart) ? Math.round((actualStart - scheduledStart) / 60_000) : null,
    endDifferenceMinutes: Number.isFinite(scheduledEnd) && Number.isFinite(actualEnd) ? Math.round((actualEnd - scheduledEnd) / 60_000) : null,
    participantNames: uniqueNames(calls.flatMap((call) => call.participantNames)), status: active ? "In progress" : "Ended",
    ...recordingSummary(calls), syncedAt: new Date()
  };
}

export async function syncMeetMonitoring() {
  if (!isValidCeoSession((await cookies()).get(CEO_SESSION_COOKIE)?.value)) throw new Error("Unauthorized");
  let synced = 0;
  try {
    const db = await getMongoDb();
    const students = await db.collection<MeetStudent>(getStudentRegistrationCollectionName()).find({ classType: "Premium 1-to-1", permanentMeetLink: { $type: "string", $ne: "" } }).project({ studentId: 1, studentName: 1, permanentMeetLink: 1 }).toArray();
    const codes: StudentCode[] = students.map((student) => ({ studentId: student.studentId || "", studentName: student.studentName || "Unknown student", meetingCode: getMeetingCode(student.permanentMeetLink || "") })).filter((student) => student.studentId && student.meetingCode);
    const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const sessions = await db.collection<SessionWithId>(getClassSessionsCollectionName()).find({ studentId: { $in: codes.map(({ studentId }) => studentId) }, classMode: "Online", scheduledAt: { $gte: new Date(since.getTime() - 86_400_000).toISOString() } }).toArray();
    const matched = new Map<string, { student: StudentCode; session: SessionWithId; calls: Call[] }>();
    const unmatched: { student: StudentCode; call: Call }[] = [];

    for (const student of codes) for (const record of await listConferenceRecords(student.meetingCode, since)) {
      const [participants, recordings] = await Promise.all([listConferenceParticipants(record.name), listConferenceRecordings(record.name)]);
      const call: Call = { record, recordings, participantNames: uniqueNames(participants.map((participant) => participant.signedinUser?.displayName || participant.anonymousUser?.displayName || participant.phoneUser?.displayName || "")) };
      const duration = durationMinutes(record);
      if (!call.participantNames.length || (duration !== null && duration < 3)) continue;
      const session = matchSession(record, student.studentId, sessions);
      if (!session?._id) { unmatched.push({ student, call }); continue; }
      const key = String(session._id);
      const group = matched.get(key) || { student, session, calls: [] };
      group.calls.push(call); matched.set(key, group);
    }

    const collection = db.collection(getMeetMonitoringCollectionName());
    await collection.createIndex({ recordKey: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    for (const group of matched.values()) {
      const summary = classSummary(group.student, group.session, group.calls);
      await collection.updateOne({ recordKey: summary.recordKey }, { $set: summary, $unset: { expiresAt: "", conferenceRecordName: "" } }, { upsert: true });
      synced++;
    }
    for (const { student, call } of unmatched) await collection.updateOne({ recordKey: `unmatched:${call.record.name}` }, { $set: {
      recordVersion: 3, recordType: "unmatched_call", recordKey: `unmatched:${call.record.name}`, conferenceRecordNames: [call.record.name],
      studentId: student.studentId, studentName: student.studentName, meetingCode: student.meetingCode,
      actualStartAt: call.record.startTime, actualEndAt: call.record.endTime || "", durationMinutes: durationMinutes(call.record),
      participantNames: call.participantNames, status: call.record.endTime ? "Ended" : "In progress", ...recordingSummary([call]), syncedAt: new Date(),
      expiresAt: new Date(new Date(call.record.startTime).getTime() + UNMATCHED_RETENTION_MS)
    } }, { upsert: true });
    await collection.deleteMany({ recordVersion: { $ne: 3 } });
    revalidatePath("/ceo/meet-monitoring");
  } catch (error) {
    redirect(messageUrl("error", error instanceof Error ? error.message : "Meet monitoring sync failed."));
  }
  redirect(messageUrl("success", `Synced ${synced} scheduled class summar${synced === 1 ? "y" : "ies"}.`));
}
