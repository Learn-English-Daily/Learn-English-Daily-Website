export const teacherMoodOptions = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "tired", emoji: "😴", label: "Tired" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "excited", emoji: "🤩", label: "Excited" },
  { value: "stressed", emoji: "😟", label: "Stressed" }
] as const;

export const teacherAvatarPresentations = ["female", "male", "neutral"] as const;
export const teacherAvatarSkinTones = ["porcelain", "warm", "golden", "brown", "deep"] as const;
export const teacherAvatarFaceShapes = ["round", "oval", "square"] as const;
export const teacherAvatarEyeStyles = ["friendly", "bright", "calm", "wink"] as const;
export const teacherAvatarFemaleHairStyles = ["bob", "waves", "curls", "bun", "ponytail", "braids", "hijab", "pixie"] as const;
export const teacherAvatarMaleHairStyles = ["crop", "fade", "quiff", "side", "curls", "long", "bald", "cap-hair"] as const;
export const teacherAvatarNeutralHairStyles = ["short", "side", "waves", "curls", "bun", "ponytail", "hijab", "bald"] as const;
export const teacherAvatarHairStyles = [...teacherAvatarFemaleHairStyles, ...teacherAvatarMaleHairStyles, ...teacherAvatarNeutralHairStyles] as const;
export const teacherAvatarFacialHairStyles = ["none", "small-moustache", "moustache", "small-beard", "full-beard", "long-beard"] as const;
export const teacherAvatarHairColors = ["black", "espresso", "chestnut", "blonde", "violet", "rose"] as const;
export const teacherAvatarOutfits = ["blazer", "sweater", "shirt", "dress", "hoodie"] as const;
export const teacherAvatarOutfitColors = ["lead-blue", "navy", "teal", "rose", "violet", "amber"] as const;
export const teacherAvatarAccessories = ["none", "glasses", "round-glasses", "headphones", "earrings", "cap"] as const;
export const teacherClassroomThemes = ["garden", "ocean", "sunset", "space"] as const;

export const defaultTeacherAvatar = {
  avatarPresentation: "neutral",
  avatarSkinTone: "golden",
  avatarFaceShape: "oval",
  avatarEyeStyle: "friendly",
  avatarHairStyle: "short",
  avatarHairColor: "espresso",
  avatarFacialHair: "none",
  avatarOutfit: "blazer",
  avatarOutfitColor: "lead-blue",
  avatarAccessory: "none"
} as const;

export type TeacherEngagementDocument = {
  teacherId: string;
  teacherName?: string;
  mood?: string;
  moodDate?: string;
  moodUpdatedAt?: Date;
  avatarFace?: string;
  avatarPresentation?: string;
  avatarSkinTone?: string;
  avatarFaceShape?: string;
  avatarEyeStyle?: string;
  avatarHairStyle?: string;
  avatarHairColor?: string;
  avatarFacialHair?: string;
  avatarOutfit?: string;
  avatarOutfitColor?: string;
  avatarAccessory?: string;
  classroomTheme?: string;
  challengeDates?: string[];
  challengeAnswers?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
};

export const dailyTeacherChallenges = [
  { question: "A quiet student finally answers in English. What is the best first response?", options: ["Correct every word", "Celebrate the effort", "Move on quickly"], answer: "Celebrate the effort" },
  { question: "Which classroom superpower helps nervous learners most?", options: ["Patience", "Speed", "More homework"], answer: "Patience" },
  { question: "A lesson activity finishes early. What is the best backup?", options: ["A short speaking game", "End immediately", "Give a long test"], answer: "A short speaking game" },
  { question: "Which question encourages a longer student answer?", options: ["Do you like it?", "Why do you like it?", "Is it blue?"], answer: "Why do you like it?" },
  { question: "A student makes a speaking mistake. What should come first?", options: ["Encouragement", "A penalty", "Silence"], answer: "Encouragement" },
  { question: "What makes an online class feel energetic?", options: ["Frequent interaction", "Teacher talks all hour", "No cameras or questions"], answer: "Frequent interaction" },
  { question: "Which ending helps students remember a lesson?", options: ["A quick recap", "A new difficult topic", "Leaving without review"], answer: "A quick recap" }
] as const;

export function getTeacherEngagementCollectionName() {
  return process.env.MONGODB_TEACHER_ENGAGEMENT_COLLECTION || "teacher_engagement";
}

export function getJakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function getDailyTeacherChallenge(date = getJakartaToday()) {
  const day = Number(date.slice(-2)) || 1;
  return dailyTeacherChallenges[(day - 1) % dailyTeacherChallenges.length];
}

export function moodDetails(value = "") {
  return teacherMoodOptions.find((option) => option.value === value) || null;
}

export function calculateTeacherStars(attendanceCount: number, journalCount: number, challengeCount: number) {
  return attendanceCount * 5 + journalCount * 10 + challengeCount * 3;
}
