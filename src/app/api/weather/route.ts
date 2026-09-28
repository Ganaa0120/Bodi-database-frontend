import { NextResponse } from 'next/server';

// Улаанбаатарын координат
const LAT = 47.9184;
const LON = 106.9177;

export async function GET() {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`,
      { next: { revalidate: 1800 } } // 30 минутад 1 удаа кэшлэнэ, дахин дуудахгүй
    );
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    return NextResponse.json({
      temperature: data.current_weather.temperature,
      weathercode: data.current_weather.weathercode,
    });
  } catch {
    return NextResponse.json({ error: 'Цаг агаарын мэдээ авах боломжгүй байна.' }, { status: 502 });
  }
}