import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { Button, Card, Display, ErrorBox, Field, Input, Notice, ToggleChip } from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/infra/supabase";

type Mode = "password" | "magic" | "phone";

/** RF-01: account with e-mail or phone (WhatsApp); Google too. Supabase handles credentials. */
export default function LoginPage() {
  const [params] = useSearchParams();
  const creating = params.get("criar") === "1";
  const type = params.get("tipo");
  const next = params.get("next") ?? (creating ? `/conta/perfis/novo${type ? `?tipo=${type}` : ""}` : "/conta");
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("password");
  const [signUp, setSignUp] = useState(creating);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Navigate to={next} replace />;
  const redirectTo = `${window.location.origin}${next}`;

  const run = async (fn: () => Promise<{ error: Error | null }>, success?: string) => {
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error: err } = await fn();
    setLoading(false);
    if (err) setError(new Error(translate(err.message)));
    else if (success) setInfo(success);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "password") {
      void run(
        () =>
          signUp
            ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
            : supabase.auth.signInWithPassword({ email, password }),
        signUp ? "Enviamos um e-mail de confirmação. Abra o link para ativar a conta." : undefined,
      );
    } else if (mode === "magic") {
      void run(
        () => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }),
        "Enviamos um link de acesso para o seu e-mail.",
      );
    } else if (!otpSent) {
      const normalized = `+55${phone.replace(/\D/g, "").replace(/^55/, "")}`;
      void run(async () => {
        const r = await supabase.auth.signInWithOtp({ phone: normalized });
        if (!r.error) setOtpSent(true);
        return r;
      }, "Enviamos um código por SMS.");
    } else {
      const normalized = `+55${phone.replace(/\D/g, "").replace(/^55/, "")}`;
      void run(() => supabase.auth.verifyOtp({ phone: normalized, token: otp, type: "sms" }));
    }
  };

  return (
    <Container className="flex justify-center py-12">
      <Card className="flex w-full max-w-md flex-col gap-5 p-6">
        <Display className="text-3xl">{signUp ? "Criar conta" : "Entrar"}</Display>
        <div className="flex flex-wrap gap-2">
          <ToggleChip selected={mode === "password"} onClick={() => setMode("password")}>
            E-mail e senha
          </ToggleChip>
          <ToggleChip selected={mode === "magic"} onClick={() => setMode("magic")}>
            Link por e-mail
          </ToggleChip>
          <ToggleChip selected={mode === "phone"} onClick={() => setMode("phone")}>
            Celular
          </ToggleChip>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {mode !== "phone" ? (
            <Field label="E-mail">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          ) : (
            <Field label="Celular (WhatsApp)" hint="DDD + número">
              <Input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(21) 99999-0000"
                disabled={otpSent}
              />
            </Field>
          )}
          {mode === "password" && (
            <Field label="Senha" hint={signUp ? "Mínimo de 8 caracteres" : undefined}>
              <Input
                type="password"
                autoComplete={signUp ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {mode === "phone" && otpSent && (
            <Field label="Código recebido por SMS">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </Field>
          )}
          {error && <ErrorBox error={error} />}
          {info && <Notice tone="ok">{info}</Notice>}
          <Button type="submit" size="lg" loading={loading}>
            {mode === "password"
              ? signUp
                ? "Criar conta"
                : "Entrar"
              : mode === "magic"
                ? "Enviar link"
                : otpSent
                  ? "Confirmar código"
                  : "Enviar código"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={() => void run(() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } }))}
        >
          Continuar com Google
        </Button>
        {mode === "password" && (
          <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={() => setSignUp(!signUp)}>
            {signUp ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
          </button>
        )}
        <p className="text-xs text-ink-muted">
          Ao continuar, você aceita os Termos de uso e a Política de privacidade.
        </p>
      </Card>
    </Container>
  );
}

const translate = (msg: string): string => {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Entre com sua senha.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/sms|phone/i.test(msg)) return "Não foi possível enviar o SMS. Tente outro método.";
  return msg;
};
