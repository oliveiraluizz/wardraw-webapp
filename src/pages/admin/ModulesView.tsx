import { useQuery } from "@tanstack/react-query";
import { Card, Chip, Display, ErrorBox, Notice, PageLoader, Select } from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { ResourcesView } from "./ResourcesView";

type Row = Record<string, unknown>;

const STATUS: Record<string, string> = {
  active: "Ativo",
  locked: "Travado (cadeado “em breve”)",
  hidden: "Oculto",
};

/** Product modules: switch areas on/off for launch; testers and the waitlist below. */
export function ModulesView() {
  const params = { limit: 50 };
  const { data, isLoading, error } = useQuery({
    queryKey: keys.admin.list("modules", params),
    queryFn: () => adminService.list("modules", params),
  });
  const update = useAdminMutation(({ code, status }: { code: string; status: string }) =>
    adminService.update("modules", code, { status }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Display className="text-4xl">Módulos</Display>
        <p className="max-w-3xl text-ink-soft">
          Cada área do produto pode estar ativa, travada (aparece com cadeado e o aviso “em breve”) ou oculta. Os
          recursos dos planos de um módulo travado ficam desligados. Super admins e testadores do módulo continuam com
          acesso para testar antes do lançamento.
        </p>
      </div>
      {isLoading && <PageLoader />}
      {error && <ErrorBox error={error} />}
      {update.error && <ErrorBox error={update.error} />}
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.data ?? []).map((m: Row) => (
          <Card key={String(m.code)} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{String(m.name)}</div>
                <div className="text-xs text-ink-muted">{String(m.code)}</div>
              </div>
              <Chip tone={m.status === "active" ? "ok" : m.status === "locked" ? "gold" : "muted"}>
                {m.status === "active" ? "Ativo" : m.status === "locked" ? "Em breve" : "Oculto"}
              </Chip>
            </div>
            {!!m.description && <p className="text-sm text-ink-soft">{String(m.description)}</p>}
            <Select
              aria-label={`Status de ${String(m.name)}`}
              value={String(m.status)}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ code: String(m.code), status: e.target.value })}
            >
              {Object.entries(STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {Array.isArray(m.dependsOn) && m.dependsOn.length > 0 && (
              <span className="text-xs text-ink-muted">Depende de: {(m.dependsOn as string[]).join(", ")}</span>
            )}
          </Card>
        ))}
      </div>
      <Notice tone="muted">
        Para testar um módulo travado no seu computador sem destravar a produção, use{" "}
        <code>MODULES_FORCE_ACTIVE=events,event_management</code> no <code>.env</code> da API local.
      </Notice>
      <ResourcesView only={["modules", "module-testers", "module-interest"]} />
    </div>
  );
}
