import { useMutation } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/infra/api/client";
import { useModule } from "@/infra/hooks/queries";
import { catalogService } from "@/infra/services/catalog.service";
import type { ModuleCode } from "@/types/domain";
import { Button, ButtonLink, Card, Display, ErrorBox, Input, Notice, PageLoader } from "../shared/ui";

/** "Coming soon" card for a locked module, with the "Avise-me" waitlist. */
export function LockedModule({
  code,
  title,
  message,
  compact = false,
}: {
  code: ModuleCode;
  title?: string | null;
  message?: string | null;
  compact?: boolean;
}) {
  const { session } = useAuth();
  const { module } = useModule(code);
  const [email, setEmail] = useState("");
  const notify = useMutation({ mutationFn: () => catalogService.moduleInterest(code, session ? undefined : email) });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    notify.mutate();
  };

  return (
    <Card
      className={
        compact ? "flex flex-col gap-3 p-5" : "mx-auto flex max-w-[560px] flex-col items-center gap-4 p-8 text-center"
      }
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-edge bg-gold-bg text-gold">
        <LockKeyhole className="h-6 w-6" aria-hidden />
      </span>
      <Display as="h2" className={compact ? "text-2xl" : "text-[32px]"}>
        {title ?? module?.lockedTitle ?? "Em breve"}
      </Display>
      <p className="text-[15px] leading-relaxed text-ink-soft">
        {message ?? module?.lockedMessage ?? "Esta área ainda não está disponível. Avisamos você quando abrir."}
      </p>
      {notify.isSuccess ? (
        <Notice tone="ok">Pronto! Avisaremos você quando abrir.</Notice>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {!session && (
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              aria-label="Seu e-mail"
              className="sm:max-w-[260px]"
            />
          )}
          <Button type="submit" disabled={notify.isPending}>
            Avise-me quando abrir
          </Button>
        </form>
      )}
      {notify.error && <ErrorBox error={notify.error} />}
      {!compact && (
        <ButtonLink to="/sparring" variant="secondary">
          Buscar sparring enquanto isso
        </ButtonLink>
      )}
    </Card>
  );
}

/** Renders the page only when the module is available to the viewer; otherwise the "coming soon" card. */
export function ModuleGate({ code, children }: { code: ModuleCode; children: ReactNode }) {
  const { available, isLoading } = useModule(code);
  if (isLoading) return <PageLoader />;
  if (!available)
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 lg:px-[120px]">
        <LockedModule code={code} />
      </div>
    );
  return <>{children}</>;
}

/** For API calls that answered `module_locked`: the card instead of a generic error. */
export function LockedFromError({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !error.moduleLocked) return <ErrorBox error={error} />;
  const details = error.details as { module?: string; title?: string } | undefined;
  return <LockedModule code={details?.module ?? ""} title={details?.title} message={error.message} />;
}
