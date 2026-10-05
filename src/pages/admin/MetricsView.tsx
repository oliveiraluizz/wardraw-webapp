import { useQuery } from "@tanstack/react-query";
import { Card, Display, ErrorBox, PageLoader } from "@/components/shared/ui";
import { keys } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { SUBSCRIPTION_STATUS_LABEL } from "@/utils/format";

type Row = Record<string, number | string | null>;

/** RF-40: pilot numbers. */
export function MetricsView() {
  const { data, isLoading, error } = useQuery({ queryKey: keys.admin.metrics, queryFn: adminService.metrics });
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error} />;
  const totals = data.totals as Row;
  const conversion = data.trialConversion as Row;
  const weekly = (data.weekly as Row[]) ?? [];
  const subscribers = (data.subscribers as Row[]) ?? [];
  const maxWeek = Math.max(1, ...weekly.map((w) => Number(w.sparring_searches) + Number(w.contacts)));
  const tiles: [string, unknown][] = [
    ["Usuários", totals.users],
    ["Novos (30 dias)", totals.new_users],
    ["Atletas com perfil completo", totals.complete_fighters],
    ["Eventos futuros", totals.upcoming_events],
    ["Inscrições (30 dias)", totals.registrations],
    ["Pagam depois do teste", conversion.percent != null ? `${conversion.percent}%` : "—"],
  ];
  return (
    <div className="flex flex-col gap-6">
      <Display className="text-3xl">Números do piloto</Display>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(([l, v]) => (
          <Card key={l} className="flex flex-col">
            <span className="font-cond text-4xl font-bold">{String(v ?? 0)}</span>
            <span className="text-sm text-ink-muted">{l}</span>
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3">
        <span className="font-bold">Buscas de sparring e contatos por semana</span>
        <div className="flex h-48 items-end gap-2" role="img" aria-label="Gráfico semanal de buscas e contatos">
          {weekly.map((w) => (
            <div key={String(w.week)} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t">
                <div
                  className="bg-brand"
                  style={{ height: `${(Number(w.sparring_searches) / maxWeek) * 160}px` }}
                  title={`${w.sparring_searches} buscas`}
                />
                <div
                  className="bg-ok"
                  style={{ height: `${(Number(w.contacts) / maxWeek) * 160}px` }}
                  title={`${w.contacts} contatos`}
                />
              </div>
              <span className="text-[10px] text-ink-muted">{String(w.week).slice(5)}</span>
            </div>
          ))}
          {!weekly.length && <span className="text-sm text-ink-muted">Sem dados ainda.</span>}
        </div>
        <div className="flex gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-brand" /> Buscas
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-ok" /> Contatos
          </span>
        </div>
      </Card>
      <Card className="flex flex-col gap-2">
        <span className="font-bold">Assinantes por plano</span>
        {subscribers.map((s, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {String(s.profile_type)} · {String(s.plan)}{" "}
              <span className="text-ink-muted">
                ({SUBSCRIPTION_STATUS_LABEL[String(s.status)] ?? String(s.status)})
              </span>
            </span>
            <span className="font-cond font-bold">{String(s.total)}</span>
          </div>
        ))}
        {!subscribers.length && <span className="text-sm text-ink-muted">Nenhum assinante ainda.</span>}
      </Card>
    </div>
  );
}
