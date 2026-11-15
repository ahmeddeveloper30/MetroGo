import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, Mail } from 'lucide-react';
import { authService } from '@/api/authService';
import AppButton from '@/components/AppButton';
import AppErrorView from '@/components/AppErrorView';
import AppInput from '@/components/AppInput';
import AppLoading from '@/components/AppLoading';
import AuthShell from '@/components/AuthShell';
import MetroLoader from '@/components/MetroLoader';
import MetroTransition from '@/components/MetroTransition';
import PasswordInput from '@/components/PasswordInput';
import { homeFor, isSupportedRole } from '@/lib/roles';
import { validateEmail, validateRequired } from '@/lib/validation';
import type { AuthUser } from '@/types/models';
import { UNSUPPORTED_ROLE_MESSAGE, useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { status, user, notice, signIn, clearNotice } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>();
  /** Set on successful login: shows the transition overlay, then navigates. */
  const [pending, setPending] = useState<{ token: string; user: AuthUser } | null>(null);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (!pending) return;
    // Brief metro transition, then sign in + navigate (fast, no extra delay).
    const t = setTimeout(() => {
      void signIn(pending.token, pending.user).then(() => {
        navigate(homeFor(pending.user.role), { replace: true });
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [pending, signIn, navigate]);

  if (status === 'loading') return <AppLoading fullScreen />;
  if (showLoader) return <MetroLoader surface="dark" size="lg" className="min-h-screen" message="جاري التحقق من بياناتك..." />;
  if (pending) return <MetroTransition />;
  if (status === 'authenticated') return <Navigate to={homeFor(user?.role)} replace />;

  const errors = {
    email: validateEmail(email),
    password: validateRequired(password, 'كلمة السر مطلوبة'),
  };
  const show = (k: 'email' | 'password') => (touched[k] ? errors[k] : null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setServerError(null);
    clearNotice();
    if (errors.email || errors.password) return;

    // Show the signature loader only if the request takes a moment (no flicker).
    setLoading(true);
    overlayTimer.current = setTimeout(() => setShowLoader(true), 200);
    const res = await authService.login({ email: email.trim(), password });
    clearTimeout(overlayTimer.current);
    setLoading(false);
    setShowLoader(false);

    if (!res.ok) return setServerError(res.message);
    if (!isSupportedRole(res.data.user.role)) return setServerError(UNSUPPORTED_ROLE_MESSAGE);
    // Hold the session briefly for the transition, then sign in + navigate.
    setPending({ token: res.data.token, user: res.data.user });
  };

  const banner = serverError ?? notice;

  return (
    <AuthShell mode="login">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-5">
        <div className="ml-fade-up">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">تسجيل الدخول</h1>
          <p className="mt-1.5 text-muted-foreground">أهلاً بعودتك! أدخل بياناتك للمتابعة إلى حسابك</p>
        </div>

        {banner && (
          <div className="ml-fade-up">
            <AppErrorView inline message={banner} />
          </div>
        )}

        <AppInput
          label="البريد الإلكتروني"
          type="email"
          ltr
          icon={Mail}
          autoComplete="username"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={show('email')}
        />

        <PasswordInput
          label="كلمة السر"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={show('password')}
        />

        <AppButton type="submit" variant="cta" size="lg" className="w-full text-base" loading={loading}>
          <LogIn className="h-[18px] w-[18px]" />
          دخول
        </AppButton>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary-dark hover:underline">
            إنشاء حساب جديد
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
