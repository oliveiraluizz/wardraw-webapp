import { useState } from "react";
import { Button, Card, Chip, ErrorBox, Field, Input, Notice, Select } from "@/components/shared/ui";
import { useCatalog, useEventMutation } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import type { EventPanel } from "@/types/domain";
import { EventForm } from "./EventForm";
import { eventFlow } from "./eventFlow";
import { measure } from "@/utils/format";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em análise pela moderação",
  published: "Publicado · inscrições abertas",
  registrations_closed: "Inscrições fechadas",
  finished: "Encerrado",
  canceled: "Cancelado",
};

export function OverviewTab({ event: e }: { event: EventPanel }) {
  const publish = useEventMutation(() => eventsService.publish(e.id));
  const status = useEventMutation((s: string) => eventsService.setStatus(e.id, s));
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center gap-3">
        <Chip tone={e.status === "published" ? "ok" : "gold"}>{STATUS_LABEL[e.status]}</Chip>
        {["draft"].includes(e.status) && (
          <Button loading={publish.isPending} onClick={() => publish.mutate(undefined)}>
            Publicar evento
          </Button>
        )}
        {e.status === "published" && (
          <Button variant="secondary" onClick={() => status.mutate("registrations_closed")}>
            Fechar inscrições
          </Button>
        )}
        {e.status === "registrations_closed" && (
          <>
            <Button variant="secondary" onClick={() => status.mutate("published")}>
              Reabrir inscrições
            </Button>
            <Button variant="secondary" onClick={() => status.mutate("finished")}>
              Encerrar evento
            </Button>
          </>
        )}
        {(publish.error || status.error) && <ErrorBox error={publish.error ?? status.error} />}
      </Card>
      <Divisions event={e} />
      <EventForm event={e} />
    </div>
  );
}

/** RF-26: categories by modality, weight, belt, age, sex and level. */
function Divisions({ event: e }: { event: EventPanel }) {
  const { data: catalog } = useCatalog();
  const flow = eventFlow(e, catalog);
  // Categories follow the event format: bracket sports in brackets, card sports (optional) for card events.
  const allowed = [...flow.bracketModalities, ...flow.cardModalities.filter((m) => !m.usesBrackets)];
  const [picked, setModalityId] = useState("");
  const modalityId = allowed.some((m) => m.id === picked) ? picked : (allowed[0]?.id ?? e.modalityIds[0] ?? "");
  const add = useEventMutation((body: Record<string, unknown>) => eventsService.addDivision(e.id, body));
  const remove = useEventMutation((id: string) => eventsService.removeDivision(e.id, id));
  const modality = catalog?.modalities.find((m) => m.id === modalityId);
  const classes = catalog?.weightClasses.filter((w) => w.modalityId === modalityId) ?? [];
  const belts = catalog?.graduationSystems[0]?.graduations ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-2xl uppercase">Categorias</h2>
      {e.divisions.map((d) => (
        <div key={d.id} className="flex items-center justify-between border-b border-line pb-2 text-sm">
          <span>
            <span className="font-bold">{d.name}</span>{" "}
            <span className="text-ink-muted">
              · {d.modality} · {d.registrations} inscritos
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => remove.mutate(d.id)}>
            Remover
          </Button>
        </div>
      ))}
      {!flow.hasBrackets ? (
        <Notice tone="muted">
          Em eventos de card as categorias são opcionais: servem para receber inscrições de lutadores interessados. As
          lutas são montadas na aba Card.
        </Notice>
      ) : (
        !e.divisions.length && <Notice tone="muted">Cadastre as categorias para receber inscrições.</Notice>
      )}
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          const wc = classes.find((w) => w.id === f.get("weightClassId"));
          const belt = belts.find((b) => b.id === f.get("graduationId"));
          const level = catalog?.levels.find((l) => l.id === f.get("levelId"));
          const sexLabel = { male: "Masculino", female: "Feminino", mixed: "Misto" }[String(f.get("sex"))];
          const name = String(
            f.get("name") ||
              [f.get("ageGroup") || "Adulto", sexLabel, belt?.name, wc?.name, level?.name].filter(Boolean).join(" · "),
          );
          add.mutate(
            {
              modalityId,
              name,
              sex: f.get("sex"),
              weightClassId: wc?.id ?? null,
              graduationId: belt?.id ?? null,
              levelId: level?.id ?? null,
              format: modality?.usesBrackets ? "bracket" : "card",
              isAbsolute: f.get("absolute") === "on",
              ageMin: f.get("ageMin") ? Number(f.get("ageMin")) : 18,
            },
            { onSuccess: () => ev.currentTarget?.reset() },
          );
        }}
      >
        <Field label="Modalidade">
          <Select value={modalityId} onChange={(ev) => setModalityId(ev.target.value)}>
            {allowed.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sexo">
          <Select name="sex">
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="mixed">Misto</option>
          </Select>
        </Field>
        <Field label="Categoria de peso">
          <Select name="weightClassId">
            <option value="">—</option>
            {classes.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.sex === "female" ? "(F)" : ""} {w.maxKg ? `até ${measure(w.maxKg)} kg` : ""}
              </option>
            ))}
          </Select>
        </Field>
        {modality?.usesBrackets && (
          <Field label="Faixa">
            <Select name="graduationId">
              <option value="">Todas</option>
              {belts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nível">
          <Select name="levelId">
            <option value="">Todos</option>
            {catalog?.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nome (opcional)">
          <Input name="name" placeholder="Gerado automaticamente" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="absolute" className="h-4 w-4 accent-brand" /> Absoluto
        </label>
        {add.error && <ErrorBox error={add.error} />}
        <Button type="submit" loading={add.isPending} className="sm:col-span-3">
          Adicionar categoria
        </Button>
      </form>
    </Card>
  );
}
