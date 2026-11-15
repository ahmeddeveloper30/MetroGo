import type { ReactNode } from 'react';
import Logo from './Logo';
import MetroTrain from './MetroTrain';

export type AuthMode = 'login' | 'register';

const COPY: Record<AuthMode, { title: string; text: string }> = {
  login: {
    title: 'أهلاً بعودتك!',
    text: 'سعداء بعودتك إلى مترو القاهرة الكبرى — خطط رحلتك، اشترِ تذكرتك، وتابع حالة الزحام في المحطات.',
  },
  register: {
    title: 'ابدأ رحلتك معنا',
    text: 'أنشئ حسابك في دقائق واستمتع بالتذاكر الرقمية، تخطيط الرحلات، والتنبيهات الفورية من شبكة المترو.',
  },
};

/** Six Cairo Metro line colour chips (the signature palette of the loader). */
function LineChips() {
  const lines = [
    { label: 'الأحمر', varName: '--m-red' },
    { label: 'الأزرق', varName: '--m-blue' },
    { label: 'الأخضر', varName: '--m-green' },
    { label: 'الأصفر', varName: '--m-yellow' },
    { label: 'البرتقالي', varName: '--m-orange' },
    { label: 'الفضي', varName: '--m-silver' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {lines.map((l) => (
        <span key={l.varName} className="flex items-center gap-1.5 text-xs text-white/70">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: `rgb(var(${l.varName}))`, boxShadow: '0 0 8px rgb(var(--m-red) / .35)' }}
          />
          {l.label}
        </span>
      ))}
    </div>
  );
}

/** Branding panel: dark surface, station tiles, train on moving tracks.
 *  Visible on ALL screen sizes — compact hero band on mobile/tablet,
 *  full two-column layout on desktop (unchanged). */
function MetroPanel({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode];
  return (
    <div className="bg-brand tile-pattern relative flex flex-col gap-5 overflow-hidden p-6 text-white sm:gap-6 sm:p-8 lg:min-h-0 lg:justify-between lg:gap-0 lg:p-12">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[rgb(var(--m-red))] opacity-25 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[rgb(var(--m-red))] opacity-20 blur-[100px]" />

      {/* branding */}
      <div className="relative">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Logo className="h-9 w-9 shrink-0 sm:h-11 sm:w-11 lg:h-12 lg:w-12" />
          <p className="font-display text-lg font-bold sm:text-2xl lg:text-3xl">مترو القاهرة الكبرى</p>
        </div>
        <p className="mt-2 hidden max-w-md text-white/75 sm:block sm:text-sm lg:text-base">المنصة الرقمية الرسمية لشبكة مترو القاهرة</p>
      </div>

      {/* train on moving tracks (scales down on small screens, always visible) */}
      <div className="relative mx-auto w-full max-w-[320px] py-3 sm:max-w-md sm:py-5 lg:max-w-lg lg:py-8">
        <div className="ml-float">
          <MetroTrain className="w-full drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]" />
        </div>
        {/* track */}
        <div className="mt-1 h-[3px] w-full rounded-full bg-white/20" />
        <div className="ml-track mt-2 h-[3px] w-full rounded-full" />
        {/* station dots on the track */}
        <div className="mt-2.5 flex justify-between px-2 sm:mt-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === 3 ? 'bg-white' : 'bg-white/35'}`} />
          ))}
        </div>
      </div>

      {/* welcome copy + line colours (secondary text hidden on mobile to keep the band compact) */}
      <div className="relative space-y-3">
        <h2 className="font-display text-base font-bold sm:text-xl lg:text-2xl">{copy.title}</h2>
        <p className="hidden max-w-md text-sm leading-7 text-white/75 sm:block">{copy.text}</p>
        <div className="pt-1 sm:pt-2">
          <LineChips />
        </div>
      </div>
    </div>
  );
}

export default function AuthShell({ mode, children }: { mode: AuthMode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form side */}
      <div className="relative flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        {/* subtle decorative route along the bottom edge */}
        <svg viewBox="0 0 600 24" className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-30" aria-hidden="true">
          <path d="M0 12 L120 12 L160 12 L220 12 L340 12 L420 12 L520 12 L600 12" stroke="rgb(var(--primary))" strokeWidth="3" strokeLinecap="round" fill="none" />
          {[60, 180, 300, 420, 540].map((x) => (
            <circle key={x} cx={x} cy="12" r="4" fill="rgb(var(--primary))" />
          ))}
        </svg>
        {children}
      </div>
      <MetroPanel mode={mode} />
    </div>
  );
}
