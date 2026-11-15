import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import AppInput from './AppInput';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'trailing'> & {
  label: string;
  error?: string | null;
};

/** Password field with a show/hide visibility toggle. */
export default function PasswordInput({ label, error, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <AppInput
      {...props}
      label={label}
      error={error}
      icon={Lock}
      ltr
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
          title={visible ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}
