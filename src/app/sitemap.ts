import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.learn-english-daily.com";
  const paths = ["", "/courses", "/about", "/blog", "/contact", "/review", "/student-registration", "/privacy-policy", "/terms"];
  const standalonePaths = ["/links", "/trial-twibbon", "/games", "/games/speech-competition", "/games/escape-room"];
  return [
    ...["en", "id"].flatMap((locale) =>
      paths.map((path) => ({
        url: `${base}/${locale}${path}`,
        lastModified: new Date("2026-05-13"),
        changeFrequency: path ? ("monthly" as const) : ("weekly" as const),
        priority: path ? 0.7 : 1
      }))
    ),
    ...standalonePaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date("2026-06-04"),
      changeFrequency: "monthly" as const,
      priority: 0.8
    }))
  ];
}
