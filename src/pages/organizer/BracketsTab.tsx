import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Chip, EmptyState, ErrorBox, Input, Notice, Select } from "@/components/shared/ui";
import { keys, useEventMutation } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import type { BracketMatchView, EventPanel } from "@/types/domain";
import { cn } from "@/utils/cn";
import { measure } from "@/utils/format";

export function BracketsTab({ event: e }: { event: EventPanel }) {
  const bracketDivisions = e.divisions.filter((d) => d.format === "bracket");
  const [divisionId, setDivisionId] = useState(bracketDivisions[0]?.id ?? "");
  const [separate, setSeparate] = useState(true);
  const bracket = useQuery({
    queryKey: keys.events.bracket(e.id, divisionId),
    queryFn: () => eventsService.bracket(e.id, divisionId),
    enabled: !!divisionId,
    retry: false,
  });
  const weigh = useQuery({
    queryKey: keys.events.weighIns(e.id, divisionId),
    queryFn: () => eventsService.weighIns(e.id, divisionId),
    enabled: !!divisionId,
  });
  const draw = useEventMutation(() => eventsService.draw(e.id, divisionId, separate));
  const publish = useEventMutation(() => eventsService.publishBracket(e.id, divisionId));
  const result = useEventMutation(({ matchId, winner }: { matchId: string; winner: string }) =>
    eventsService.matchResult(e.id, matchId, { winnerRegistrationId: winner, method: "points" }),
  );
  const weighIn = useEventMutation((b: Record<string, unknown>) => eventsService.weighIn(e.id, b));

  if (!bracketDivisions.length)
    return <EmptyState title="Sem categorias de chave">Crie categorias de Jiu-Jitsu na visão geral.</EmptyState>;
  const b = bracket.data;
  const isDraft = !b?.bracket || b.bracket.status === "draft";
  const limit = weigh.data?.[0]?.limit_kg;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-80"
          value={divisionId}
          onChange={(ev) => setDivisionId(ev.target.value)}
          aria-label="Categoria"
        >
          {bracketDivisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.registrations} atletas)
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={separate}
            onChange={(ev) => setSeparate(ev.target.checked)}
          />
          Separar atletas do mesmo time na primeira rodada
        </label>
        <div className="flex-1" />
        {isDraft && (
          <Button variant="secondary" loading={draw.isPending} onClick={() => draw.mutate(undefined)}>
            {b?.bracket ? "Sortear de novo" : "Sortear chave"}
          </Button>
        )}
        {b?.bracket && isDraft && (
          <Button loading={publish.isPending} onClick={() => publish.mutate(undefined)}>
            Publicar chave
          </Button>
        )}
        {b?.bracket && !isDraft && <Chip tone="ok">Chave publicada</Chip>}
      </div>
      {(draw.error || publish.error || result.error || weighIn.error) && (
        <ErrorBox error={draw.error ?? publish.error ?? result.error ?? weighIn.error} />
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-x-auto">
          {!b?.rounds.length ? (
            <EmptyState title="Chave ainda não sorteada">Aprove as inscrições e sorteie a chave.</EmptyState>
          ) : (
            <div className="flex min-w-max gap-6">
              {b.rounds.map((r) => (
                <div key={r.round} className="flex w-56 flex-col justify-around gap-3">
                  <span className="font-cond text-sm font-semibold uppercase text-ink-muted">{r.label}</span>
                  {r.matches.map((m) => (
                    <MatchBox
                      key={m.id}
                      m={m}
                      published={!isDraft}
                      onWin={(winner) => result.mutate({ matchId: m.id, winner })}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl uppercase">Pesagem</span>
            {limit && <span className="text-sm text-ink-muted">limite {measure(limit)} kg</span>}
          </div>
          {weigh.data?.map((w) => (
            <form
              key={w.registration_id}
              className="flex items-center gap-2 text-sm"
              onSubmit={(ev) => {
                ev.preventDefault();
                const kg = Number(new FormData(ev.currentTarget).get("kg"));
                if (kg)
                  weighIn.mutate({
                    registrationId: w.registration_id,
                    fighterProfileId: w.fighter_profile_id,
                    weightKg: kg,
                  });
              }}
            >
              <span className="flex-1 truncate">{w.display_name}</span>
              <Input
                name="kg"
                className="h-9 w-20"
                inputMode="decimal"
                defaultValue={w.weight_kg ?? ""}
                aria-label={`Peso de ${w.display_name}`}
              />
              <Chip tone={w.status === "approved" ? "ok" : w.status === "pending" ? "muted" : "hot"}>
                {{
                  approved: "Aprovado",
                  pending: "Pendente",
                  over_weight: "Acima do peso",
                  disqualified: "Desclassificado",
                  moved_division: "Mudou de categoria",
                }[w.status] ?? w.status}
              </Chip>
              {w.status === "over_weight" && (
                <button
                  type="button"
                  className="text-xs text-brand-hot underline"
                  onClick={() =>
                    weighIn.mutate({
                      registrationId: w.registration_id,
                      fighterProfileId: w.fighter_profile_id,
                      weightKg: Number(w.weight_kg),
                      status: "disqualified",
                    })
                  }
                >
                  Desclassificar
                </button>
              )}
            </form>
          ))}
          <Notice tone="muted">
            Atleta acima do peso pode mudar de categoria ou ser desclassificado. A chave se ajusta sozinha.
          </Notice>
        </Card>
      </div>
    </div>
  );
}

function MatchBox({
  m,
  published,
  onWin,
}: {
  m: BracketMatchView;
  published: boolean;
  onWin: (registrationId: string) => void;
}) {
  const row = (id: string | null, name: string | null, team: string | null) => {
    const won = !!id && m.winner_registration_id === id;
    const canPick = published && m.status === "ready" && !!id;
    return (
      <button
        type="button"
        disabled={!canPick}
        onClick={() => id && onWin(id)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
          won ? "bg-ok-bg font-bold text-ok" : "",
          canPick && "hover:bg-surface-2",
        )}
        title={canPick ? "Marcar vencedor" : undefined}
      >
        <span className="truncate">{name ?? (m.is_bye ? "—" : "A definir")}</span>
        <span className="shrink-0 text-xs text-ink-muted">{team ?? (id ? "Indep." : "")}</span>
      </button>
    );
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      {row(m.a_registration_id, m.a_name, m.a_team)}
      <div className="h-px bg-line" />
      {row(m.b_registration_id, m.b_name, m.b_team)}
    </div>
  );
}
