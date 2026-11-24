export const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const levels = ["Foundation", "Confident", "Fluent"] as const;

export function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function ordinalWord(value: number) {
  const small = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth"];
  if (value < 20) return small[value];
  const tens = value < 30 ? "twent" : "thirt";
  if (value % 10 === 0) return `${tens}ieth`;
  return `${tens}y-${small[value % 10]}`;
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function weekdayFor(year: number, monthIndex: number, day: number) {
  return weekdays[new Date(year, monthIndex, day, 12).getDay()];
}

export function formatGameDate(year: number, monthIndex: number, day: number) {
  return `${months[monthIndex]} ${ordinal(day)}, ${year}`;
}

export function nextWeekdayInMonth(year: number, monthIndex: number, weekday: number, afterDay: number) {
  const total = daysInMonth(year, monthIndex);
  for (let day = afterDay + 1; day <= total; day += 1) if (new Date(year, monthIndex, day, 12).getDay() === weekday) return day;
  for (let day = 1; day <= total; day += 1) if (new Date(year, monthIndex, day, 12).getDay() === weekday) return day;
  return 1;
}

export type ChoiceMission = { prompt: string; choices: string[]; answer: string; transcript?: string };

export const sliceMissions: ChoiceMission[][] = [
  [
    { prompt: "Slice the weekend days!", choices: ["Saturday", "Monday", "Sunday", "Thursday"], answer: "Saturday|Sunday" },
    { prompt: "Slice the month after June!", choices: ["May", "July", "August", "June"], answer: "July" },
    { prompt: "Slice the correct ordinal for 21!", choices: ["21th", "21st", "21nd", "21rd"], answer: "21st" },
    { prompt: "Slice the day before Friday!", choices: ["Saturday", "Wednesday", "Thursday", "Monday"], answer: "Thursday" }
  ],
  [
    { prompt: "Today is Monday. Slice tomorrow!", choices: ["Sunday", "Tuesday", "Friday", "Monday"], answer: "Tuesday" },
    { prompt: "Slice the month before October!", choices: ["August", "November", "September", "October"], answer: "September" },
    { prompt: "Slice the two correct ordinals!", choices: ["12nd", "22nd", "13rd", "31st"], answer: "22nd|31st" },
    { prompt: "Slice the day after this Friday!", choices: ["Thursday", "Saturday", "Friday", "Sunday"], answer: "Saturday" }
  ],
  [
    { prompt: "The appointment is two days after Tuesday. Slice it!", choices: ["Wednesday", "Thursday", "Friday", "Monday"], answer: "Thursday" },
    { prompt: "The event was last month. This month is March. Slice it!", choices: ["January", "February", "April", "March"], answer: "February" },
    { prompt: "Slice the dates with correct suffixes!", choices: ["11st", "13th", "23rd", "30nd"], answer: "13th|23rd" },
    { prompt: "The meeting is the Friday after this Friday. Slice the expression!", choices: ["last Friday", "today", "next Friday", "yesterday"], answer: "next Friday" }
  ]
];

export const runnerMissions: ChoiceMission[][] = [
  [
    { prompt: "What day comes after Wednesday?", choices: ["Tuesday", "Thursday", "Friday"], answer: "Thursday" },
    { prompt: "What month comes before August?", choices: ["June", "July", "September"], answer: "July" },
    { prompt: "Today is Monday. What day is tomorrow?", choices: ["Sunday", "Tuesday", "Wednesday"], answer: "Tuesday" },
    { prompt: "The party is on the twelfth. Find it!", choices: ["12th", "12nd", "20th"], answer: "12th" }
  ],
  [
    { prompt: "English class is two days after Tuesday.", choices: ["Wednesday", "Thursday", "Friday"], answer: "Thursday" },
    { prompt: "The birthday is on May twenty-second.", choices: ["May 20th", "May 22nd", "March 22nd"], answer: "May 22nd" },
    { prompt: "Today is Friday. Choose next week's same day.", choices: ["this Friday", "next Friday", "last Friday"], answer: "next Friday" },
    { prompt: "Which phrase is correct for a date?", choices: ["in May 12th", "on May 12th", "at May 12th"], answer: "on May 12th" }
  ],
  [
    { prompt: "The appointment moved from Tuesday to two days later.", choices: ["Monday", "Thursday", "Saturday"], answer: "Thursday" },
    { prompt: "The exhibition happened one month before November.", choices: ["September", "October", "December"], answer: "October" },
    { prompt: "Choose the upcoming event expression.", choices: ["last week", "next week", "yesterday"], answer: "next week" },
    { prompt: "The deadline is immediately before the 31st.", choices: ["29th", "30th", "1st"], answer: "30th" }
  ]
];

export const factoryRounds = [
  { prompt: "What day is it?", words: ["It's", "Monday."], distractors: ["on", "in"] },
  { prompt: "What is the date today?", words: ["It's", "October", "5th."], distractors: ["on", "at"] },
  { prompt: "When is your birthday?", words: ["It's", "on", "May", "12th."], distractors: ["in", "at"] },
  { prompt: "When is English class?", words: ["Our", "English", "class", "is", "on", "Thursday."], distractors: ["in", "at"] },
  { prompt: "How did the appointment change?", words: ["The", "appointment", "moved", "from", "Tuesday", "to", "Thursday."], distractors: ["in", "after"] },
  { prompt: "When is the next meeting?", words: ["Our", "next", "meeting", "is", "scheduled", "for", "November", "20th."], distractors: ["last", "yesterday"] }
];

