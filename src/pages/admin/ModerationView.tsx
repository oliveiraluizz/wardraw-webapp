import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Chip, Display, EmptyState, ErrorBox, PageLoader, ToggleChip } from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";

type Row = Record<string, unknown>;
type Tab = "profiles" | "events" | "verifications" | "reports";

/** RF-37 / RF-39 / RN-07: approval queues, document checks and reports. */
export function ModerationView() {
  const [tab, setTab] = useState<Tab>("profiles");
  return (
    <div className="flex flex-col gap-5">
      <Display className="text-3xl">Moderação</Display>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["profiles", "Perfis"],
            ["events", "Eventos"],
            ["verifications", "Verificações"],
            ["reports", "Denúncias"],
          ] as const
        ).map(([k, l]) => (
          <ToggleChip key={k} selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </ToggleChip>
        ))}
      </div>
      {tab === "profiles" && <Profiles />}
      {tab === "events" && <Events />}
      {tab === "verifications" && <Verifications />}
      {tab === "reports" && <Reports />}
    </div>
  );
}

function Queue({
  query,
  render,
}: {
  query: { data?: Row[]; isLoading: boolean; error: unknown };
  render: (r: Row) => React.ReactNode;
}) {
  if (query.isLoading) return <PageLoader />;
  if (query.error) return <ErrorBox error={query.error} />;
  if (!query.data?.length) return <EmptyState title="Fila vazia" />;
  return <div className="flex flex-col gap-3">{query.data.map(render)}</div>;
}

function Profiles() {
  const query = useQuery({
    queryKey: keys.admin.moderation("profiles"),
    queryFn: () => adminService.moderationProfiles("pending_review"),
  });
  const decide = useAdminMutation(({ id, action, reason }: { id: string; action: string; reason?: string }) =>
    adminService.decideProfile(id, action, reason),
  );
  return (
    <>
      {decide.error && <ErrorBox error={decide.error} />}
      <Queue
        query={query}
        render={(p) => (
          <Card key={String(p.id)} className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[220px] flex-1 flex-col">
              <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="font-bold hover:text-brand-hot">
                {String(p.display_name)}
              </a>
              <span className="text-xs text-ink-muted">
                {String(p.type)} · {String(p.city ?? "")} · {String(p.email ?? p.phone ?? "")}
              </span>
            </div>
            {Number(p.open_reports) > 0 && <Chip tone="hot">{String(p.open_reports)} denúncia(s)</Chip>}
            <Button size="sm" onClick={() => decide.mutate({ id: String(p.id), action: "approve" })}>
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                decide.mutate({
                  id: String(p.id),
                  action: "reject",
                  reason: prompt("Motivo (o usuário verá):") ?? undefined,
                })
              }
            >
              Pedir ajustes
            </Button>
          </Card>
        )}
      />
    </>
  );
}

function Events() {
  const query = useQuery({ queryKey: keys.admin.moderation("events"), queryFn: adminService.moderationEvents });
  const decide = useAdminMutation(({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) =>
    adminService.decideEvent(id, approve, notes),
  );
  return (
    <Queue
      query={query}
      render={(e) => (
        <Card key={String(e.id)} className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 flex-col">
            <span className="font-bold">{String(e.name)}</span>
            <span className="text-xs text-ink-muted">
              {String(e.organizer)} · {new Date(String(e.starts_at)).toLocaleString("pt-BR")}
            </span>
          </div>
          <Chip tone={e.organizer_document === "verified" ? "ok" : "gold"}>
            Documento: {String(e.organizer_document)}
          </Chip>
          <Button size="sm" onClick={() => decide.mutate({ id: String(e.id), approve: true })}>
            Publicar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              decide.mutate({ id: String(e.id), approve: false, notes: prompt("O que precisa mudar?") ?? undefined })
            }
          >
            Devolver
          </Button>
        </Card>
      )}
    />
  );
}

function Verifications() {
  const query = useQuery({ queryKey: keys.admin.moderation("verifications"), queryFn: adminService.verifications });
  const decide = useAdminMutation(({ id, approve }: { id: string; approve: boolean }) =>
    adminService.decideVerification(id, approve, approve ? undefined : (prompt("Motivo:") ?? undefined)),
  );
  return (
    <Queue
      query={query}
      render={(v) => (
        <Card key={String(v.id)} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{String(v.display_name)}</span>
            <Chip tone="gold">{String(v.rule_name ?? v.subject_type)}</Chip>
            {!!v.category && <Chip>{String(v.category)}</Chip>}
          </div>
          {!!v.field_values && (
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2 text-xs">
              {JSON.stringify(v.field_values, null, 2)}
            </pre>
          )}
          {!!v.document_number && (
            <span className="text-sm">
              {String(v.document_type).toUpperCase()}: {String(v.document_number)} · {String(v.legal_name ?? "")}
            </span>
          )}
          {((v.documents as { url: string | null; label?: string }[]) ?? []).map((d, i) =>
            d.url ? (
              <a key={i} href={d.url} target="_blank" rel="noreferrer" className="text-sm text-brand-hot">
                Ver documento {d.label ?? i + 1}
              </a>
            ) : null,
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decide.mutate({ id: String(v.id), approve: true })}>
              Aprovar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: String(v.id), approve: false })}>
              Recusar
            </Button>
          </div>
        </Card>
      )}
    />
  );
}

function Reports() {
  const query = useQuery({ queryKey: keys.admin.moderation("reports"), queryFn: adminService.reports });
  const handle = useAdminMutation(({ id, status }: { id: string; status: string }) =>
    adminService.handleReport(id, status),
  );
  return (
    <Queue
      query={query}
      render={(r) => (
        <Card key={String(r.id)} className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 flex-col">
            <span className="font-bold">{String(r.subject_name ?? r.subject_id)}</span>
            <span className="text-xs text-ink-muted">
              {String(r.reason)} · por {String(r.reporter_email)} {r.details ? `· ${String(r.details)}` : ""}
            </span>
          </div>
          <Button size="sm" onClick={() => handle.mutate({ id: String(r.id), status: "resolved" })}>
            Resolvido
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handle.mutate({ id: String(r.id), status: "dismissed" })}
          >
            Descartar
          </Button>
        </Card>
      )}
    />
  );
}
