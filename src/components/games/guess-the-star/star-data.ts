export type StarCategory =
  | "Sports"
  | "Music"
  | "Movies & Entertainment"
  | "Indonesian Stars"
  | "Inspiring People";

export type StarProfile = {
  id: string;
  name: string;
  pronoun: "He" | "She";
  category: StarCategory;
  country: string;
  occupation: string;
  image: string;
  clues: [string, string, string];
  description: string;
  achievement: string;
  vocabulary: string[];
  factSource: string;
  credit: {
    creator: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  };
};

export const stars: StarProfile[] = [
  {
    id: "s01",
    name: "Lionel Messi",
    pronoun: "He",
    category: "Sports",
    country: "Argentina",
    occupation: "footballer",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lionel-Messi-Argentina-2022-FIFA-World-Cup.jpg?width=700",
    clues: [
      "He is a world-famous athlete.",
      "He is an Argentine footballer.",
      "He captained Argentina when they won the 2022 FIFA World Cup.",
    ],
    description:
      "He is an Argentine footballer famous for his achievements in football.",
    achievement: "captained Argentina to the 2022 FIFA World Cup title",
    vocabulary: ["athlete", "captain", "achievement"],
    factSource:
      "https://www.fifa.com/fifaplus/en/articles/lionel-messi-argentina-profile-history-achievements",
    credit: {
      creator: "Hossein Zohrevand / Tasnim News Agency",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Lionel-Messi-Argentina-2022-FIFA-World-Cup.jpg",
    },
  },
  {
    id: "s02",
    name: "Cristiano Ronaldo",
    pronoun: "He",
    category: "Sports",
    country: "Portugal",
    occupation: "footballer",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cristiano_Ronaldo_2018.jpg?width=700",
    clues: [
      "He is a famous athlete.",
      "He is a Portuguese footballer.",
      "He has captained Portugal and played in several FIFA World Cups.",
    ],
    description:
      "He is a Portuguese footballer with a long international career.",
    achievement: "captained Portugal's national football team",
    vocabulary: ["footballer", "international", "captain"],
    factSource: "https://www.fifa.com/fifaplus/en/players/cristiano-ronaldo",
    credit: {
      creator: "Kirill Venediktov",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Cristiano_Ronaldo_2018.jpg",
    },
  },
  {
    id: "s03",
    name: "Serena Williams",
    pronoun: "She",
    category: "Sports",
    country: "United States",
    occupation: "tennis player",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Serena_williams.jpg?width=700",
    clues: [
      "She is a celebrated athlete.",
      "She is an American tennis player.",
      "She won 23 Grand Slam singles titles.",
    ],
    description:
      "She is an American tennis player with 23 Grand Slam singles titles.",
    achievement: "won 23 Grand Slam singles titles",
    vocabulary: ["champion", "determined", "tournament"],
    factSource: "https://www.wtatennis.com/players/230234/serena-williams",
    credit: {
      creator: "Wikigo",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Serena_williams.jpg",
    },
  },
  {
    id: "s04",
    name: "Jackie Chan",
    pronoun: "He",
    category: "Movies & Entertainment",
    country: "Hong Kong",
    occupation: "actor and filmmaker",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Jackie_Chan_2002-portrait.jpg?width=700",
    clues: [
      "He works in movies.",
      "He is an actor and filmmaker from Hong Kong.",
      "He is known internationally for action-comedy films and stunt work.",
    ],
    description: "He is an actor and filmmaker known for action-comedy films.",
    achievement: "built an international career in action-comedy films",
    vocabulary: ["actor", "filmmaker", "stunt"],
    factSource: "https://www.oscars.org/governors-awards/2016/jackie-chan",
    credit: {
      creator: "Lee M. McCaskill / U.S. Navy",
      license: "Public domain (US Government)",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Jackie_Chan_2002-portrait.jpg",
    },
  },
  {
    id: "s05",
    name: "B. J. Habibie",
    pronoun: "He",
    category: "Inspiring People",
    country: "Indonesia",
    occupation: "engineer and former president",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/B._J._Habibie,_President_of_Indonesia_portrait.jpg?width=700",
    clues: [
      "He was an engineer and national leader.",
      "He was from Indonesia.",
      "He served as the third president of Indonesia.",
    ],
    description:
      "He was an Indonesian engineer who became the country's third president.",
    achievement: "served as Indonesia's third president",
    vocabulary: ["engineer", "president", "technology"],
    factSource:
      "https://www.presidenri.go.id/presiden-republik-indonesia/bacharuddin-jusuf-habibie/",
    credit: {
      creator: "Office of the Vice President, Republic of Indonesia",
      license: "Public domain in Indonesia",
      licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-IDGov",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:B._J._Habibie,_President_of_Indonesia_portrait.jpg",
    },
  },
  {
    id: "s06",
    name: "Maudy Ayunda",
    pronoun: "She",
    category: "Indonesian Stars",
    country: "Indonesia",
    occupation: "singer and actress",
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Maudy_Ayunda_at_Sundance_Film_Festival_2026-6.jpg?width=700",
    clues: [
      "She works in music and movies.",
      "She is an Indonesian singer and actress.",
      "She has studied at the University of Oxford and Stanford University.",
    ],
    description:
      "She is an Indonesian singer and actress who also studied at Oxford and Stanford.",
    achievement:
      "worked in entertainment and completed studies at Oxford and Stanford",
    vocabulary: ["singer", "actress", "education"],
    factSource:
      "https://www.ox.ac.uk/news/arts-blog/maudy-ayunda-oxford-indonesia",
    credit: {
      creator: "Casey J. Newell",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Maudy_Ayunda_at_Sundance_Film_Festival_2026-6.jpg",
    },
  },
];

export const categories = [
  "Mixed Stars",
  "Sports",
  "Music",
  "Movies & Entertainment",
  "Indonesian Stars",
  "Inspiring People",
] as const;
export type GameCategory = (typeof categories)[number];

export function categoryPool(category: GameCategory) {
  if (category === "Mixed Stars") return stars;
  if (category === "Music")
    return stars.filter(
      (star) => star.category === "Music" || star.id === "s06",
    );
  const filtered = stars.filter((star) => star.category === category);
  return filtered.length >= 2 ? filtered : stars;
}
