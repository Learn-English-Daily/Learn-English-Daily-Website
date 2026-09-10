export type ReadingStory = {
  id: string;
  character: string;
  sentences: string[];
  mixedSentenceOrder: number[];
  evidence: { prompt: string; answer: string; sentenceIndex: number }[];
};

export const aliStory: ReadingStory = {
  id: "ali",
  character: "Ali",
  sentences: [
    "This is Ali.",
    "He is ten.",
    "He likes school.",
    "He has a blue bag.",
    "He reads books every day."
  ],
  mixedSentenceOrder: [4, 0, 3, 1, 2],
  evidence: [
    { prompt: "How old is Ali?", answer: "Ali is ten.", sentenceIndex: 1 },
    { prompt: "What color is Ali's bag?", answer: "Ali has a blue bag.", sentenceIndex: 3 },
    { prompt: "What does Ali read?", answer: "Ali reads books every day.", sentenceIndex: 4 }
  ]
};

export const emmaStory: ReadingStory = {
  id: "emma",
  character: "Emma",
  sentences: [
    "This is Emma.",
    "She is nine.",
    "She likes drawing.",
    "She has a red pencil case.",
    "She reads after school."
  ],
  mixedSentenceOrder: [2, 4, 0, 3, 1],
  evidence: [
    { prompt: "How old is Emma?", answer: "Emma is nine.", sentenceIndex: 1 },
    { prompt: "What does Emma like?", answer: "Emma likes drawing.", sentenceIndex: 2 },
    { prompt: "When does Emma read?", answer: "Emma reads after school.", sentenceIndex: 4 }
  ]
};

export const mixedWords = ["ten.", "is", "He", "Ali.", "This", "is"];
export const correctWords = ["This", "is", "Ali.", "He", "is", "ten."];

export const storyChoices = {
  name: ["Sam", "Maya", "Leo"],
  age: ["eight", "nine", "ten"],
  likes: ["music", "football", "painting"],
  item: ["green notebook", "yellow backpack", "blue bicycle"]
};
