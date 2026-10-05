import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  Eyebrow,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  SimilarityBadge,
} from "@/components/shared/ui";
import { ApiError } from "@/infra/api/client";
import { keys, useCatalog, useEventMutation, useMe } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import { searchService } from "@/infra/services/search.service";
import type { CardBout, EventPanel } from "@/types/domain";
import { measure } from "@/utils/format";

const STATUS: Record<string, { label: string; tone: "ok" | "gold" | "hot" | "muted" }> = {
  confirmed: { label: "Confirmada", tone: "ok" },
  pending_confirmation: { label: "Aguardando lutador", tone: "gold" },
  open_slot: { label: "Vaga aberta", tone: "hot" },
  draft: { label: "Rascunho", tone: "muted" },
  finished: { label: "Encerrada", tone: "muted" },
  canceled: { label: "Cancelada", tone: "muted" },
};

export function CardTab({ event: e }: { event: EventPanel }) {
  const { data: bouts, error } = useQuery({
    queryKey: keys.events.bouts(e.id),
    queryFn: () => eventsService.bouts(e.id),
  });
  const [adding, setAdding] = useState(false);
  const [matching, setMatching] = useState<CardBout | null>(null);
  const opening = useEventMutation((b: CardBout) =>
    eventsService.opening(e.id, {
      boutId: b.id,
      modalityId: e.modalityIds[0],
      weightKg: b.weight_limit_kg ?? undefined,
      description: `Procuro lutador ${b.weight_limit_kg ?? ""} kg`,
    }),
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase">Card</h2>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Adicionar luta
          </Button>
        </div>
        {error && <ErrorBox error={error} />}
        {opening.error && <ErrorBox error={opening.error} />}
        {opening.isSuccess && <Notice tone="ok">Vaga publicada. Lutadores e coaches veem em “Vagas abertas”.</Notice>}
        {!bouts?.length && (
          <EmptyState title="Card vazio">
            Adicione as lutas e convide os lutadores. Cada um confirma pela plataforma.
          </EmptyState>
        )}
        {bouts?.map((b, i) => {
          const st = STATUS[b.status] ?? STATUS.draft;
          return (
            <Card key={b.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Eyebrow className="text-ink-soft">
                  {b.label ?? (i === 0 ? "Luta principal" : i === 1 ? "Co-principal" : `Luta ${i + 1}`)}
                </Eyebrow>
                <Chip tone={st.tone}>{st.label}</Chip>
              </div>
              <div className="flex items-center gap-3">
                <Fighter name={b.a_name} />
                <span className="font-display text-lg text-ink-muted">VS</span>
                <Fighter name={b.b_name} right />
              </div>
              <span className="text-xs text-ink-muted">
                {[
                  b.weight_class,
                  b.weight_limit_kg && `${measure(b.weight_limit_kg)} kg`,
                  `${b.rounds} x ${b.round_minutes} min`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {b.status === "open_slot" && (
                <div className="flex flex-col gap-2 rounded-xl border border-brand-edge bg-brand-deep p-3">
                  <span className="text-sm">
                    {b.a_name ?? b.b_name ?? "A luta"} precisa de adversário. Busque na plataforma ou publique a vaga.
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setMatching(b)}
                      disabled={!b.a_fighter_profile_id && !b.b_fighter_profile_id}
                    >
                      Buscar lutadores
                    </Button>
                    <Button size="sm" variant="secondary" loading={opening.isPending} onClick={() => opening.mutate(b)}>
                      Publicar vaga
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <div>
        {matching ? (
          <MatchPanel event={e} bout={matching} onDone={() => setMatching(null)} />
        ) : (
          <Notice tone="muted">
            Escolha uma luta com vaga aberta e toque em “Buscar lutadores” para casar a luta.
          </Notice>
        )}
      </div>
      <AddBout event={e} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

const Fighter = ({ name, right }: { name: string | null; right?: boolean }) => (
  <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
    <Avatar name={name ?? "?"} size={40} />
    <span className={`truncate font-bold ${name ? "" : "text-ink-muted"}`}>{name ?? "A definir"}</span>
  </div>
);

function AddBout({ event: e, open, onClose }: { event: EventPanel; open: boolean; onClose: () => void }) {
  const { data: catalog } = useCatalog();
  const [modalityId, setModalityId] = useState(e.modalityIds[0] ?? "");
  const save = useEventMutation((b: Record<string, unknown>) => eventsService.saveBout(e.id, b));
  return (
    <Modal open={open} onClose={onClose} title="Adicionar luta">
      <form
        className="flex flex-col gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          const wc = catalog?.weightClasses.find((w) => w.id === f.get("weightClassId"));
          save.mutate(
            {
              modalityId,
              label: f.get("label") || undefined,
              weightClassId: wc?.id ?? null,
              weightLimitKg: wc?.maxKg ?? (f.get("kg") ? Number(f.get("kg")) : null),
              rounds: Number(f.get("rounds") || 3),
              roundMinutes: Number(f.get("minutes") || 5),
              isTitle: f.get("title") === "on",
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Modalidade">
          <Select value={modalityId} onChange={(ev) => setModalityId(ev.target.value)}>
            {catalog?.modalities
              .filter((m) => e.modalityIds.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Categoria de peso">
          <Select name="weightClassId">
            <option value="">Peso combinado</option>
            {catalog?.weightClasses
              .filter((w) => w.modalityId === modalityId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.maxKg ? `· ${measure(w.maxKg)} kg` : ""}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Peso (kg)">
            <Input name="kg" inputMode="decimal" />
          </Field>
          <Field label="Rounds">
            <Input name="rounds" inputMode="numeric" defaultValue="3" />
          </Field>
          <Field label="Min/round">
            <Input name="minutes" inputMode="decimal" defaultValue="5" />
          </Field>
        </div>
        <Field label="Rótulo (opcional)">
          <Input name="label" placeholder="Luta principal, co-principal..." />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="title" className="h-4 w-4 accent-brand" /> Disputa de cinturão
        </label>
        {save.error && <ErrorBox error={save.error} />}
        <Button type="submit" loading={save.isPending}>
          Adicionar
        </Button>
      </form>
    </Modal>
  );
}

/** "Casar a luta": suggestions near side A's measures + side-by-side comparison (Liga: comparison.any_pair). */
function MatchPanel({ event: e, bout, onDone }: { event: EventPanel; bout: CardBout; onDone: () => void }) {
  const { data: me } = useMe();
  const organizer = me?.profiles.find((p) => p.type === "organizer");
  const sideA = bout.a_fighter_profile_id ?? bout.b_fighter_profile_id!;
  const aProfile = useQuery({ queryKey: ["profile", sideA], queryFn: () => searchService.profile(sideA) });
  const a = aProfile.data;
  const suggestions = useQuery({
    queryKey: ["matchSuggestions", sideA],
    enabled: !!a && !!organizer,
    retry: false,
    queryFn: () =>
      searchService.sparring({
        asProfileId: organizer!.id,
        mode: "filters",
        fightWeightKg: a?.fight_weight_kg
          ? { min: Number(a.fight_weight_kg) - 3, max: Number(a.fight_weight_kg) + 3 }
          : undefined,
        sort: "record",
      }),
  });
  const candidates = (suggestions.data?.results ?? []).filter((r) => r.id !== sideA);
  const [sideB, setSideB] = useState<string>("");
  const b = sideB || candidates[0]?.id || "";
  const comparison = useQuery({
    queryKey: ["compare", organizer?.id, sideA, b],
    queryFn: () => searchService.compare(organizer!.id, sideA, b),
    enabled: !!b && !!organizer,
    retry: false,
  });
  const invite = useEventMutation(() =>
    eventsService.saveBout(
      e.id,
      bout.a_fighter_profile_id
        ? { modalityId: e.modalityIds[0], bFighterProfileId: b }
        : { modalityId: e.modalityIds[0], aFighterProfileId: b },
      bout.id,
    ),
  );
  const c = comparison.data;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl uppercase">Casar a luta</h3>
        {organizer?.plan && <Chip tone="gold">Plano {organizer.plan.name}</Chip>}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Lado A</span>
        <span className="font-bold">{a?.displayName ?? "…"}</span>
      </div>
      <Field label={`Lado B · sugestão ${candidates.findIndex((x) => x.id === b) + 1 || 1} de ${candidates.length}`}>
        <Select value={b} onChange={(ev) => setSideB(ev.target.value)}>
          {candidates.map((x) => (
            <option key={x.id} value={x.id}>
              {x.displayName} · {measure(x.fightWeightKg) ?? "?"} kg · {x.record.wins}-{x.record.losses}
            </option>
          ))}
        </Select>
      </Field>
      {suggestions.error && <ErrorBox error={suggestions.error} />}
      {c?.locked && <Notice>{c.message}</Notice>}
      {comparison.error instanceof ApiError && <ErrorBox error={comparison.error} />}
      {c && !c.locked && c.summary && (
        <>
          <div className="grid grid-cols-3 items-center text-center">
            <div>
              <span className="font-cond text-3xl font-bold">{c.summary.a}</span>
              <span className="block text-xs text-ink-muted">vantagens A</span>
            </div>
            <SimilarityBadge percent={c.summary.similarityPercent} label="semelhança" />
            <div>
              <span className="font-cond text-3xl font-bold">{c.summary.b}</span>
              <span className="block text-xs text-ink-muted">vantagens B</span>
            </div>
          </div>
          <div className="flex flex-col">
            {c.indicators
              ?.filter((i) =>
                [
                  "height",
                  "reach",
                  "fightWeight",
                  "age",
                  "record",
                  "winRate",
                  "koWins",
                  "lastFight",
                  "stance",
                  "base",
                ].includes(i.key),
              )
              .map((i) => (
                <div key={i.key} className="grid grid-cols-3 border-b border-line py-1.5 text-sm last:border-0">
                  <span className={i.advantage === "a" ? "font-bold text-ok" : ""}>{fmt(i.a)}</span>
                  <span className="text-center text-ink-muted">{i.label}</span>
                  <span className={`text-right ${i.advantage === "b" ? "font-bold text-ok" : ""}`}>{fmt(i.b)}</span>
                </div>
              ))}
          </div>
        </>
      )}
      {invite.error && <ErrorBox error={invite.error} />}
      <Button disabled={!b} loading={invite.isPending} onClick={() => invite.mutate(undefined, { onSuccess: onDone })}>
        Convidar os dois lutadores
      </Button>
      <p className="text-xs text-ink-muted">
        Cada lutador (ou o coach dele) confirma pela plataforma. Valores de bolsa são combinados direto com eles.
      </p>
    </Card>
  );
}

const fmt = (v: unknown): string => {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return (v as { kg?: number }).kg != null ? `${(v as { kg: number }).kg} kg` : "—";
  return String(v);
};
