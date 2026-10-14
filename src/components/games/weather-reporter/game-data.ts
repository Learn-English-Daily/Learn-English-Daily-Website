export const stageNames = ["Weather Pop", "Dress-Up Relay", "Weather Adventure", "Forecast Flip", "TV Studio"];

export type Weather = { id: string; label: string; emoji: string; sky: string; sentence: string };
export const weather: Weather[] = [
  { id: "sunny", label: "sunny", emoji: "☀️", sky: "from-sky-400 to-cyan-200", sentence: "It's sunny." },
  { id: "rainy", label: "rainy", emoji: "🌧️", sky: "from-slate-500 to-blue-300", sentence: "It's rainy." },
  { id: "cloudy", label: "cloudy", emoji: "☁️", sky: "from-slate-400 to-slate-200", sentence: "It's cloudy." },
  { id: "windy", label: "windy", emoji: "🌬️", sky: "from-cyan-500 to-slate-200", sentence: "It's windy." },
  { id: "snowy", label: "snowy", emoji: "🌨️", sky: "from-blue-200 to-white", sentence: "It's snowy." },
  { id: "hot", label: "hot", emoji: "🥵", sky: "from-orange-500 to-yellow-200", sentence: "It's hot." },
  { id: "cold", label: "cold", emoji: "🥶", sky: "from-blue-700 to-cyan-200", sentence: "It's cold." }
];

export const forecasts = [
  { city: "Jakarta", weather: "rainy", temperature: "24°C" },
  { city: "Bali", weather: "sunny", temperature: "31°C" },
  { city: "Bandung", weather: "cloudy", temperature: "20°C" },
  { city: "London", weather: "windy", temperature: "12°C" }
];
