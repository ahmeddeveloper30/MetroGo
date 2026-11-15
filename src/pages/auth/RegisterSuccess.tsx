import { useEffect, useState } from 'react';
import MetroTrain from '@/components/MetroTrain';

/**
 * Registration success scene — stays inside the registration page.
 * A Cairo Metro train accelerates in from the screen edge, settles
 * above moving tracks with motion blur, red lighting and particles,
 * then the welcome text and CTA appear.
 */
export default function RegisterSuccess({ onDone, userName }: { onDone: () => void; userName?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const particles = [
    { left: '18%', top: '40%', px: '-70px', py: '-50px', d: '.2s' },
    { left: '30%', top: '30%', px: '-90px', py: '-20px', d: '.45s' },
    { left: '45%', top: '55%', px: '-60px', py: '-70px', d: '.1s' },
    { left: '55%', top: '35%', px: '-100px', py: '-40px', d: '.6s' },
    { left: '65%', top: '48%', px: '-80px', py: '-55px', d: '.3s' },
    { left: '75%', top: '28%', px: '-110px', py: '-25px', d: '.55s' },
  ];

  return (
    <div className="bg-brand tile-pattern relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-white">
      {/* ambient red glows */}
      <div className="pointer-events-none absolute -top-32 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[rgb(var(--m-red))] opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-[rgb(var(--m-red))] opacity-25 blur-[110px]" />

      {/* particles trailing the train */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="ml-particle pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white/80"
          style={{ left: p.left, top: p.top, '--px': p.px, '--py': p.py, '--d': p.d } as React.CSSProperties}
        />
      ))}

      {/* train + tracks */}
      <div className="relative w-full max-w-3xl">
        {/* motion blur streaks behind the train */}
        <div className="pointer-events-none absolute inset-y-6 right-0 w-1/2" aria-hidden="true">
          <div className="ml-streak absolute right-0 top-2 h-[3px] w-full rounded-full" style={{ top: '18%' }} />
          <div className="ml-streak absolute right-0 h-[2px] w-full rounded-full" style={{ top: '40%', animationDelay: '.15s' }} />
          <div className="ml-streak absolute right-0 h-[3px] w-full rounded-full" style={{ top: '62%', animationDelay: '.3s' }} />
        </div>

        <div className="ml-train-in relative">
          <MetroTrain className="w-full drop-shadow-[0_20px_35px_rgba(0,0,0,.5)]" />
        </div>

        {/* moving metro tracks */}
        <div className="mt-2 h-1 w-full rounded-full bg-white/25" />
        <div className="ml-track mt-2 h-1 w-full rounded-full bg-white/60" />
        <div className="mt-4 flex justify-between px-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i === 4 ? 'bg-white' : 'bg-white/35'}`} />
          ))}
        </div>
      </div>

      {/* messages + CTA */}
      <div className="mt-10 text-center">
        <h1 className="ml-fade-up font-display text-3xl font-bold sm:text-4xl" style={{ '--d': '.9s' } as React.CSSProperties}>
          تم إنشاء حسابك بنجاح!
        </h1>
        <p className="ml-fade-up mt-3 text-base text-white/80 sm:text-lg" style={{ '--d': '1.15s' } as React.CSSProperties}>
          أهلاً بك في مترو القاهرة الكبرى{userName ? `، ${userName}` : ''}
        </p>
        <div className="ml-fade-up mt-8" style={{ '--d': '1.5s' } as React.CSSProperties}>
          <button
            onClick={onDone}
            disabled={!ready}
            className="rounded-md bg-[rgb(var(--primary))] px-10 py-3.5 text-base font-bold text-white shadow-lg shadow-[rgb(var(--m-red))/.35] transition-all hover:bg-[rgb(var(--primary-dark))] hover:shadow-xl active:scale-[.97] disabled:pointer-events-none disabled:opacity-0"
          >
            ابدأ رحلتك
          </button>
        </div>
      </div>
    </div>
  );
}
