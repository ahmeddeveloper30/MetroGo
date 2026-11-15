import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, UserRound } from 'lucide-react';
import { authService } from '@/api/authService';
import AppButton from '@/components/AppButton';
import AppErrorView from '@/components/AppErrorView';
import AppInput from '@/components/AppInput';
import AppLoading from '@/components/AppLoading';
import AuthShell from '@/components/AuthShell';
import MetroLoader from '@/components/MetroLoader';
import PasswordInput from '@/components/PasswordInput';
import RegisterSuccess from './RegisterSuccess';
import { homeFor } from '@/lib/roles';
import { normalizePhone, validateEmail, validateFullName, validatePassword, validatePhone } from '@/lib/validation';
import type { AuthUser } from '@/types/models';
import { useAuthStore } from '@/store/authStore';

type Field = 'fullName' | 'email' | 'phone' | 'password' | 'confirm';
const empty: Record<Field, string> = { fullName: '', email: '', phone: '', password: '', confirm: '' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { status, user, signIn } = useAuthStore();
  const [values, setValues] = useState<Record<Field, string>>(empty);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ fullName: false, email: false, phone: false, password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>();
  /** Set only after BOTH register and login succeed on the backend. */
  const [success, setSuccess] = useState<{ token: string; user: AuthUser } | null>(null);
  const [showLoader, setShowLoader] = useState(false);

  if (status === 'loading') return <AppLoading fullScreen />;
  if (success) {
    // Stay on the registration page: play the train animation, sign in on CTA click.
    return (
      <RegisterSuccess
        userName={success.user.fullName}
        onDone={() => {
          void signIn(success.token, success.user).then(() => {
            navigate(homeFor(success.user.role), { replace: true });
          });
        }}
      />
    );
  }
  if (status === 'authenticated') return <Navigate to={homeFor(user?.role)} replace />;

  const errors: Record<Field, string | null> = {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    password: validatePassword(values.password),
    confirm: values.confirm === values.password ? null : 'كلمة السر غير متطابقة',
  };
  const bind = (k: Field) => ({
    value: values[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((s) => ({ ...s, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: touched[k] ? errors[k] : null,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, phone: true, password: true, confirm: true });
    setServerError(null);
    if (Object.values(errors).some(Boolean)) return;

    // Show the signature loader only if the requests take a moment (no flicker).
    setLoading(true);
    overlayTimer.current = setTimeout(() => setShowLoader(true), 200);
    const email = values.email.trim();
    const reg = await authService.register({
      fullName: values.fullName.trim(), email, password: values.password, phone: normalizePhone(values.phone),
    });
    if (!reg.ok) {
      clearTimeout(overlayTimer.current);
      setLoading(false);
      setShowLoader(false);
      return setServerError(reg.message);
    }
    // The register endpoint returns no token, so sign in right away with the same credentials.
    const login = await authService.login({ email, password: values.password });
    clearTimeout(overlayTimer.current);
    setLoading(false);
    setShowLoader(false);
    if (!login.ok) return navigate('/login', { replace: true });
    // Backend registration succeeded -> celebrate inside this page.
    setSuccess({ token: login.data.token, user: login.data.user });
  };

  return (
    <AuthShell mode="register">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-4">
        <div className="ml-fade-up">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">إنشاء حساب</h1>
          <p className="mt-1.5 text-muted-foreground">سجل بياناتك لتبدأ رحلتك على شبكة المترو</p>
        </div>

        {serverError && (
          <div className="ml-fade-up">
            <AppErrorView inline message={serverError} />
          </div>
        )}

        <AppInput label="الاسم الكامل" icon={UserRound} autoComplete="name" placeholder="محمد أحمد" {...bind('fullName')} />
        <AppInput label="البريد الإلكتروني" type="email" ltr icon={Mail} autoComplete="email" placeholder="example@mail.com" {...bind('email')} />
        <AppInput label="رقم الهاتف" type="tel" ltr icon={Phone} autoComplete="tel" placeholder="01xxxxxxxxx" {...bind('phone')} />
        <PasswordInput label="كلمة السر" autoComplete="new-password" placeholder="8 أحرف على الأقل مع رقم" {...bind('password')} />
        <PasswordInput label="تأكيد كلمة السر" autoComplete="new-password" placeholder="أعد إدخال كلمة السر" {...bind('confirm')} />

        <AppButton type="submit" variant="cta" size="lg" className="mt-2 w-full text-base" loading={loading}>
          إنشاء الحساب
        </AppButton>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary-dark hover:underline">
            تسجيل الدخول
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
