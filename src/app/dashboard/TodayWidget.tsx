"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
} from "lucide-react";
import type { Language } from "@/lib/types";

const WEEKDAYS_MN = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
const MONTHS_MN = [
  "1-р сарын",
  "2-р сарын",
  "3-р сарын",
  "4-р сарын",
  "5-р сарын",
  "6-р сарын",
  "7-р сарын",
  "8-р сарын",
  "9-р сарын",
  "10-р сарын",
  "11-р сарын",
  "12-р сарын",
];

function formatDate(language: Language): string {
  const now = new Date();
  if (language === "mn") {
    // Node/Vercel-ийн ICU сан заримдаа "mn-MN" locale-ийг дэмждэггүй
    // тул toLocaleDateString-д найдахгүй, гараар бичнэ.
    const weekday = WEEKDAYS_MN[now.getDay()];
    const month = MONTHS_MN[now.getMonth()];
    return `${weekday}, ${month} ${now.getDate()} `;
  }
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// WMO цаг агаарын код → icon хамаарал (Open-Meteo-ийн стандарт код)
function getWeatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function TodayWidget({ language }: { language: Language }) {
  const [weather, setWeather] = useState<{
    temperature: number;
    weathercode: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.temperature === "number")
          setWeather(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dateStr = formatDate(language);
  const WeatherIcon = weather ? getWeatherIcon(weather.weathercode) : null;

  return (
    <div className="hidden items-center gap-3 text-sm text-slate-400 sm:flex">
      <span>{dateStr}</span>
      {weather && WeatherIcon && (
        <>
          <span className="h-3.5 w-px bg-white/10" />
          <span className="flex items-center gap-1.5">
            <WeatherIcon className="h-4 w-4 text-sky-300" />
            {Math.round(weather.temperature)}°C
          </span>
        </>
      )}
    </div>
  );
}
