"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertFullAdminAccess } from "@/lib/admin-permissions";
import { getClassSessionsCollectionName, type ClassSessionDocument } from "@/lib/class-sessions";
import {
  getMeetingCode,
  getMeetMonitoringCollectionName,
  listConferenceParticipants,
  listConferenceRecords
} from "@/lib/google-meet-monitoring";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

type MeetStudent = { studentId?: string; studentName?: string; permanentMeetLink?: string };

function messageUrl(kind: "success" | "error", message: string) {
  return `/admin/meet-monitoring?${kind}=${encodeURIComponent(message)}`;
}

export async function syncMeetMonitoring() {
  await assertFullAdminAccess();
  let synced = 0;

  try {
    const db = await getMongoDb();
    const students = await db.collection<MeetStudent>(getStudentRegistrationCollectionName()).find({
      classType: "Premium 1-to-1",
      permanentMeetLink: { $type: "string", $ne: "" }
    }).project({ studentId: 1, studentName: 1, permanentMeetLink: 1 }).toArray();
    const codes = students.map((student) => ({
      studentId: student.studentId || "",
      studentName: student.studentName || "Unknown student",
      meetingCode: getMeetingCode(student.permanentMeetLink || "")
    })).filter((student) => student.studentId && student.meetingCode);

    const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const sessions = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({
      studentId: { $in: codes.map((student) => student.studentId) },
      classMode: "Online",
      scheduledAt: { $gte: new Date(since.getTime() - 24 * 60 * 60 * 1000).toISOString() }
    }).toArray();
    const monitoring = db.collection(getMeetMonitoringCollectionName());
    for (const student of codes) {
      const records = await listConferenceRecords(student.meetingCode, since);
      for (const record of records) {
        const actualStartMs = new Date(record.startTime).getTime();
        const possibleSessions = sessions.filter((session) => session.studentId === student.studentId && session.scheduledAt);
        const matchedSession = possibleSessions
          .map((session) => ({ session, distance: Math.abs(new Date(session.scheduledAt || "").getTime() - actualStartMs) }))
          .filter((candidate) => Number.isFinite(candidate.distance) && candidate.distance <= 12 * 60 * 60 * 1000)
          .sort((a, b) => a.distance - b.distance)[0]?.session;
        const participants = await listConferenceParticipants(record.name);
        const participantNames = participants.map((participant) =>
          participant.signedinUser?.displayName || participant.anonymousUser?.displayName || participant.phoneUser?.displayName || "Unknown participant"
        );
        const scheduledStartMs = matchedSession?.scheduledAt ? new Date(matchedSession.scheduledAt).getTime() : NaN;
        const scheduledEndMs = matchedSession?.endsAt ? new Date(matchedSession.endsAt).getTime() : NaN;
        const actualEndMs = record.endTime ? new Date(record.endTime).getTime() : NaN;

        await monitoring.updateOne(
          { conferenceRecordName: record.name },
          { $set: {
            conferenceRecordName: record.name,
            spaceName: record.space,
            meetingCode: student.meetingCode,
            studentId: student.studentId,
            studentName: student.studentName,
            classSessionId: matchedSession?._id?.toString() || "",
            meetingNumber: matchedSession?.meetingNumber || null,
            sessionDate: matchedSession?.sessionDate || "",
            scheduledStartAt: matchedSession?.scheduledAt || "",
            scheduledEndAt: matchedSession?.endsAt || "",
            teacherNames: matchedSession?.teacherNames || [],
            actualStartAt: record.startTime,
            actualEndAt: record.endTime || "",
            durationMinutes: Number.isFinite(actualEndMs) ? Math.max(0, Math.round((actualEndMs - actualStartMs) / 60000)) : null,
            startDifferenceMinutes: Number.isFinite(scheduledStartMs) ? Math.round((actualStartMs - scheduledStartMs) / 60000) : null,
            endDifferenceMinutes: Number.isFinite(scheduledEndMs) && Number.isFinite(actualEndMs) ? Math.round((actualEndMs - scheduledEndMs) / 60000) : null,
            participantCount: participants.length,
            participantNames,
            status: record.endTime ? "Ended" : "In progress",
            syncedAt: new Date()
          }},
          { upsert: true }
        );
        synced += 1;
      }
    }

    revalidatePath("/admin/meet-monitoring");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meet monitoring sync failed.";
    redirect(messageUrl("error", message));
  }
  redirect(messageUrl("success", `Synced ${synced} Meet call${synced === 1 ? "" : "s"} from the last 31 days.`));
}
