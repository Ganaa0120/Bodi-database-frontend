# Bodi Financial Frontend — Login Foundation

Next.js 16 (App Router, TypeScript, Tailwind v4) — `bodi-financial-backend`-тэй
хамт ажилладаг frontend. Энэ шатанд **login + auth урсгал** бүрэн, dashboard
нь зөвхөн урсгалыг баталгаажуулах placeholder (дизайн дараагийн шатанд).

## Яагаад Route Handler proxy ашигласан бэ (чухал архитектур)

Frontend (Vercel) болон backend (Azure App Service) өөр домэйнд байрлана.
Хэрэв browser шууд Azure руу login хүсэлт явуулж, refresh token-ийг
httpOnly cookie-оор авах гэвэл **cross-site cookie** асуудалтай тулгарна
(SameSite бодлого, гуравдагч этгээдийн cookie хязгаарлалт).

Тиймээс:

```
Browser → Next.js Route Handler (ижил домэйн) → Backend (server-to-server)
```

- `src/lib/backendClient.ts` — зөвхөн server дээр ажилладаг (`server-only`
  package-аар хамгаалагдсан), Azure backend руу дуудлага хийж, Set-Cookie
  header-с refresh token-ийг задлан авдаг.
- `src/app/api/auth/*/route.ts` — 4 endpoint (`login`, `refresh`, `logout`,
  `me`) нь энэ client-ийг ашиглан backend руу proxy хийж, өөрийн cookie-г
  Vercel-ийн домэйн дээр дахин тавьдаг.
- `src/proxy.ts` (Next.js 16-ийн шинэ нэршил, өмнөх `middleware.ts`) энэ
  **өөрийн** cookie-г уншиж `/dashboard`-ыг хамгаална.

**Access token** нь browser JS memory дотор (`AuthContext`, `useRef`) л
байрлана — localStorage-д хэзээ ч хадгалагдахгүй (XSS-ийн эрсдэлийг
багасгах). Хуудас дахин ачаалагдах бүрд `silentRefresh()` автоматаар
ажиллаж, httpOnly cookie ашиглан шинэ access token авдаг.

⚠️ **Анхаар**: `src/proxy.ts` (болон middleware ерөнхийдөө) зөвхөн session
cookie **ОРШИН БАЙГАА эсэхийг** шалгадаг — хүчинтэй эсэхийг биш (үүнийг
зөвхөн backend л мэднэ). Жинхэнэ аюулгүй байдлын хамгаалалт бол backend
API дээрх access token шалгалт + RLS — frontend routing зөвхөн UX-д
зориулагдсан.

## Суулгах, ажиллуулах

### 1. Dependency суулгах

```bash
npm install
```

### 2. `.env.local` бэлдэх

```bash
cp .env.local.example .env.local
```

- `BACKEND_URL` — `bodi-financial-backend`-ийн бодит URL (локал дээр
  `http://localhost:4000`, Azure дээр App Service-ийн URL)
- `COOKIE_SECURE` — локал `http://` дээр турших үед `false`, production
  (`https://`) дээр заавал `true`

### 3. Backend-ийг эхлээд асаах

`bodi-financial-backend`-ийг тусад нь ажиллуулсан байх ёстой (migration +
seed хийгдсэн, сервер `http://localhost:4000` дээр сонсож байгаа).

### 4. Frontend ажиллуулах

```bash
npm run dev
```

`http://localhost:3000` дээр нээгдэнэ → `/login` руу автоматаар шилжинэ.

### 5. Production build шалгах

```bash
npm run build
```

## Файлын бүтэц

```
src/
  app/
    page.tsx              # root — cookie-с хамаарч /login эсвэл /dashboard руу
    login/page.tsx         # split-screen login layout
    dashboard/page.tsx     # placeholder, дараа дизайн хийгдэнэ
    api/auth/
      login/route.ts
      refresh/route.ts
      logout/route.ts
      me/route.ts
    globals.css             # Tailwind v4 theme tokens
    layout.tsx              # font ачаалалт (Lora + Inter), AuthProvider
  components/
    LoginForm.tsx
  contexts/
    AuthContext.tsx         # access token (in-memory), silent refresh
  lib/
    backendClient.ts        # server-only, Azure backend рүү дуудлага
    session.ts               # cookie тохиргооны тогтмолууд
    types.ts
  proxy.ts                   # route хамгаалалт (Next.js 16 конвенц)
```

## Дизайн

`DESIGN.md` файлд өнгө/фонтын token систем баримтжуулсан.

**Одоогийн login дизайн** (3-р хувилбар, эх дизайны репогийн CSS/зурагтай
бүрэн тохирсон): `BackgroundAmbient` (canvas дээр анимацитай гэрлэн шугам +
бодит корпорацийн дэвсгэр зураг), `NavbarHeader` (лого + хэл/горим
сэлгэгч), `LoginForm` дотор нь interactive 3D tilt/glare glass карт
(`border-beam-container`, `glass-sheen`), доор нь аюулгүй байдлын мэдэгдэл
(footer). Бүх glass CSS (`glass-panel`, `glass-input` гэх мэт) эх репогийн
`index.css`-тэй яг адил хуулбарласан.

⚠️ **`BackgroundAmbient`-ийн дэвсгэр зураг**: эх дизайны репо
(`github.com/Ganaa0120/Bodidatabase`)-с бодит корпорацийн зургийг татаж
`/public/images/corporate-bg.jpg`-д байрлуулсан. `BackgroundAmbient`-д
`backgroundImageSrc="/images/corporate-bg.jpg"` дамжуулагдаж байгаа тул
шууд ажиллана.

⚠️ **`/forgot-password`**: одоогоор зөвхөн "тун удахгүй" гэсэн мессежтэй
stub хуудас. Эх дизайн дотор ирсэн `ForgotPasswordFlow` component-ийг
зориудаар холбоогүй — учир нь OTP кодыг client-side дээр өөрөө үүсгэж,
дэлгэц дээр шууд харуулдаг тул (**"Simulated Verification Code"**) бодит
нууц үг сэргээх урсгал болгож ашиглавал ноцтой аюулгүй байдлын цоорхой
үүсгэнэ. Бодит backend дэмжлэгтэй (имэйл илгээх, reset token) хувилбар
хийхийг дараагийн ажлаар санал болгож байна.

**Фонтын сонголтын тэмдэглэл**: эхэнд Newsreader сонгосон боловч энэ фонт
Монгол кирилл (Ө, Ү) агуулдаг `cyrillic-ext` subset-ийг дэмждэггүй нь
илэрсэн тул **Lora**-руу сольсон (`cyrillic`, `cyrillic-ext` хоёуланг нь
дэмждэг).

## Дараагийн алхмууд (энэ scope-д ороогүй)

- Бодит backend дэмжлэгтэй нууц үг сэргээх урсгал (`/forgot-password`)
- Dashboard-ийн бодит дизайн (компани/хэлтэс мэдээлэл, KPI chart)
- `authorizedFetch()`-г ашиглан жинхэнэ дата татах (одоогоор зөвхөн auth
  endpoint-үүдэд ашиглагдаж байгаа)
- Форм бөглөх UI (HR/Finance), file upload (Azure Blob SAS)
