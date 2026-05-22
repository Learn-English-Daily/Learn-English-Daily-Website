import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://learnenglishdaily.example";
  const paths = ["", "/courses", "/about", "/blog", "/contact", "/privacy-policy", "/terms"];
  return ["en", "id"].flatMap((locale) =>
    paths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date("2026-05-13"),
      changeFrequency: path ? "monthly" : "weekly",
      priority: path ? 0.7 : 1
    }))
  );
}

