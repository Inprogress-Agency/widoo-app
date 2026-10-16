import { messages } from '@/messages/fr';
import { Field, Input } from '@widoo/ui';

type CodeFieldProps = {
  id: string;
  code: string;
  onCodeChange: (code: string) => void;
};

/** Length of a code of an authenticator app. */
export const codeLength = 6;

/** The 6-digit code of an authenticator app: digits only, offered by the keyboard of a phone. */
export function CodeField({ id, code, onCodeChange }: CodeFieldProps) {
  return (
    <Field label={messages.signIn.code.label} htmlFor={id} isRequired>
      <Input
        id={id}
        large
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`\\d{${codeLength}}`}
        maxLength={codeLength}
        placeholder={messages.signIn.code.placeholder}
        value={code}
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ''))}
      />
    </Field>
  );
}
