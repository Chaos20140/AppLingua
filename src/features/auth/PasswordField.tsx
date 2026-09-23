import { useId, useState, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton, TextField } from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { PASSWORD_MAX_LENGTH } from '../../data/auth';
import { STRENGTH_LABELS, STRENGTH_TIPS, passwordStrength } from './passwordStrength';
import s from './Auth.module.css';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string | null;
  hint?: string;
  showStrength?: boolean;
  enterKeyHint?: 'go' | 'next' | 'done';
  ref?: Ref<HTMLInputElement>;
}

/** Passwortfeld mit Anzeigen/Verbergen und optionaler Stärkeanzeige. */
export function PasswordField({ label, value, onChange, autoComplete, error, hint, showStrength = false, enterKeyHint = 'go', ref }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const strengthId = useId();
  const strength = passwordStrength(value);
  return (
    <>
      <TextField
        ref={ref}
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        maxLength={PASSWORD_MAX_LENGTH}
        error={error}
        hint={hint}
        aria-describedby={showStrength && value ? strengthId : undefined}
        trailing={
          <IconButton
            label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
            icon={visible ? <EyeOff size={20} /> : <Eye size={20} />}
            pressed={visible}
            onClick={() => setVisible((v) => !v)}
          />
        }
      />
      {showStrength && value && (
        <div className={cx(s.strength, s[`s${strength}`])} id={strengthId}>
          <div className={s.meter} aria-hidden="true">
            <span className={s.seg} />
            <span className={s.seg} />
            <span className={s.seg} />
            <span className={s.seg} />
          </div>
          <p className={s.strengthText} aria-live="polite">
            <strong>Passwortstärke: {STRENGTH_LABELS[strength]}</strong> – {STRENGTH_TIPS[strength]}
          </p>
        </div>
      )}
    </>
  );
}
