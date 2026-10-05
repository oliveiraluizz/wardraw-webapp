import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  Notice,
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { keys, useEventMutation } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import type { EventPanel, RegistrationRow } from "@/types/domain";

const BY: Record<string, string> = { self: "O próprio atleta", coach: "Coach", team: "Time" };

export function RegistrationsTab({ event: e }: { event: EventPanel }) {
  const [filter, setFilter] = useState<"all" | "pending" | "unpaid">("all");
  const [divisionId, setDivisionId] = useState("");
  const q = {
    status: filter === "pending" ? "pending" : undefined,
    payment: filter === "unpaid" ? "unpaid" : undefined,
    divisionId: divisionId || undefined,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: keys.events.registrations(e.id, q),
    queryFn: () => eventsService.registrations(e.id, q),
  });
  const decide = useEventMutation(({ id, status }: { id: string; status: "approved" | "rejected" }) =>
    eventsService.decide(e.id, id, status),
  );
  const pay = useEventMutation(({ id, status }: { id: string; status: string }) =>
    eventsService.markPayment(e.id, id, status),
  );

  const stats = [
    [e.counts.registrations, "inscritos"],
    [e.counts.approved, "aprovados"],
    [e.counts.pending, "aguardando aprovação"],
    [e.counts.paid, "marcados como pagos"],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([n, l]) => (
          <Card key={l} className="flex flex-col">
            <span className="font-cond text-4xl font-bold">{n}</span>
            <span className="text-sm text-ink-muted">{l}</span>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleChip selected={filter === "all"} onClick={() => setFilter("all")}>
          Todas
        </ToggleChip>
        <ToggleChip selected={filter === "pending"} onClick={() => setFilter("pending")}>
          Pendentes
        </ToggleChip>
        <ToggleChip selected={filter === "unpaid"} onClick={() => setFilter("unpaid")}>
          Sem pagamento
        </ToggleChip>
        <Select
          className="ml-auto w-72"
          value={divisionId}
          onChange={(ev) => setDivisionId(ev.target.value)}
          aria-label="Categoria"
        >
          <option value="">Todas as categorias</option>
          {e.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      {(error || decide.error || pay.error) && <ErrorBox error={error ?? decide.error ?? pay.error} />}
      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <EmptyState title="Nenhuma inscrição" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface text-ink-muted">
              <tr>
                {["Atleta", "Time", "Categoria", "Inscrito por", "Inscrição", "Pagamento", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r: RegistrationRow) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-bold">{r.fighter_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.team ?? "Independente"}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.division}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.registered_by_kind === "self" ? BY.self : `${BY[r.registered_by_kind]} ${r.registered_by ?? ""}`}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={r.status === "approved" ? "ok" : r.status === "pending" ? "gold" : "hot"}>
                      {
                        {
                          pending: "Pendente",
                          approved: "Aprovada",
                          rejected: "Recusada",
                          withdrawn: "Desistiu",
                          disqualified: "Desclassificado",
                        }[r.status]
                      }
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={r.payment_status === "unpaid" ? "muted" : "ok"}>
                      {r.payment_status === "unpaid" ? "A confirmar" : r.payment_status === "paid" ? "Pago" : "Isento"}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide.mutate({ id: r.id, status: "approved" })}>
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => decide.mutate({ id: r.id, status: "rejected" })}
                        >
                          Recusar
                        </Button>
                      </div>
                    ) : r.status === "approved" && r.payment_status === "unpaid" ? (
                      <Button size="sm" variant="secondary" onClick={() => pay.mutate({ id: r.id, status: "paid" })}>
                        Marcar pago
                      </Button>
                    ) : r.status === "approved" ? (
                      <span className="text-ok">Tudo certo</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Notice tone="muted">
        O Wardraw não recebe a taxa de inscrição: você combina o pagamento com o atleta e marca como pago aqui.
      </Notice>
    </div>
  );
}
