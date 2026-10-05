import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Chip, EmptyState, ErrorBox, Field, Input, Notice, Select } from "@/components/shared/ui";
import { get, post } from "@/infra/api/client";
import { keys, useCatalog, useEventMutation, useMe } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import { searchService } from "@/infra/services/search.service";
import type { CardBout, EventPanel } from "@/types/domain";

/** RF-54: results update both fighters' records automatically. */
export function ResultsTab({ event: e }: { event: EventPanel }) {
  const { data: bouts } = useQuery({ queryKey: keys.events.bouts(e.id), queryFn: () => eventsService.bouts(e.id) });
  const ready = (bouts ?? []).filter((b) => ["confirmed", "finished"].includes(b.status));
  if (!ready.length)
    return (
      <EmptyState title="Nada para lançar">
        Resultados ficam disponíveis para lutas do card confirmadas pelos dois lutadores.
        {e.format !== "card" && " Nas chaves, marque o vencedor direto em Chaves e pesagem."}
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      {ready.map((b) => (
        <ResultRow key={b.id} eventId={e.id} bout={b} />
      ))}
    </div>
  );
}

function ResultRow({ eventId, bout: b }: { eventId: string; bout: CardBout }) {
  const save = useEventMutation((body: Record<string, unknown>) => eventsService.boutResult(eventId, b.id, body));
  if (b.status === "finished")
    return (
      <Card className="flex items-center justify-between text-sm">
        <span>
          <span className={b.winner_side === "a" ? "font-bold text-ok" : ""}>{b.a_name}</span> vs{" "}
          <span className={b.winner_side === "b" ? "font-bold text-ok" : ""}>{b.b_name}</span>
        </span>
        <Chip>Resultado lançado</Chip>
      </Card>
    );
  return (
    <Card>
      <form
        className="grid items-end gap-3 sm:grid-cols-5"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          save.mutate({
            winnerSide: f.get("winner"),
            method: f.get("method") || undefined,
            round: f.get("round") ? Number(f.get("round")) : undefined,
            time: f.get("time") || undefined,
          });
        }}
      >
        <span className="font-bold sm:col-span-5">
          {b.a_name} vs {b.b_name}
        </span>
        <Field label="Vencedor">
          <Select name="winner" required>
            <option value="a">{b.a_name}</option>
            <option value="b">{b.b_name}</option>
            <option value="draw">Empate</option>
            <option value="no_contest">Sem resultado</option>
          </Select>
        </Field>
        <Field label="Método">
          <Select name="method">
            <option value="ko_tko">KO/TKO</option>
            <option value="submission">Finalização</option>
            <option value="decision">Decisão</option>
            <option value="dq">Desclassificação</option>
            <option value="other">Outro</option>
          </Select>
        </Field>
        <Field label="Round">
          <Input name="round" inputMode="numeric" />
        </Field>
        <Field label="Tempo">
          <Input name="time" placeholder="3:42" />
        </Field>
        <Button type="submit" loading={save.isPending}>
          Lançar
        </Button>
        {save.error && (
          <div className="sm:col-span-5">
            <ErrorBox error={save.error} />
          </div>
        )}
      </form>
    </Card>
  );
}

/** RF-53: invite providers with a role (they accept through their inbox). */
export function StaffTab({ event: e }: { event: EventPanel }) {
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const organizer = me?.profiles.find((p) => p.type === "organizer");
  const staff = useQuery({
    queryKey: ["staff", e.id],
    queryFn: () => get<{ id: string; status: string; role: string; display_name: string }[]>(`/events/${e.id}/staff`),
  });
  const [categoryId, setCategoryId] = useState("");
  const providers = useQuery({
    queryKey: ["staffProviders", categoryId],
    queryFn: () => searchService.providers({ categoryId: categoryId || undefined }),
  });
  const [roleId, setRoleId] = useState("");
  const invite = useMutation({
    mutationFn: (targetProfileId: string) =>
      post("/links", {
        kind: "event_staff",
        actorProfileId: organizer!.id,
        eventId: e.id,
        targetProfileId,
        staffRoleId: roleId,
      }),
  });
  const categories = catalog?.serviceFamilies.flatMap((f) => f.categories) ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-2xl uppercase">Equipe de trabalho</h2>
        {staff.data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span className="font-bold">{s.display_name}</span>
            <span className="flex gap-2">
              <Chip tone="gold">{s.role}</Chip>
              <Chip tone={s.status === "confirmed" ? "ok" : "muted"}>
                {s.status === "confirmed" ? "Confirmado" : "Convite enviado"}
              </Chip>
            </span>
          </div>
        ))}
        {!staff.data?.length && <p className="text-sm text-ink-muted">Ninguém escalado ainda.</p>}
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-2xl uppercase">Escalar prestador</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Serviço">
            <Select value={categoryId} onChange={(ev) => setCategoryId(ev.target.value)}>
              <option value="">Todos</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Função no evento">
            <Select value={roleId} onChange={(ev) => setRoleId(ev.target.value)}>
              <option value="">Escolha</option>
              {catalog?.eventStaffRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {providers.data?.results.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span>
              <span className="font-bold">{p.display_name}</span>{" "}
              <span className="text-ink-muted">{p.categories?.[0]?.title}</span>
            </span>
            <Button size="sm" variant="secondary" disabled={!roleId} onClick={() => invite.mutate(p.id)}>
              Convidar
            </Button>
          </div>
        ))}
        {invite.isSuccess && <Notice tone="ok">Convite enviado. O prestador confirma pela plataforma.</Notice>}
        {invite.error && <ErrorBox error={invite.error} />}
      </Card>
    </div>
  );
}
