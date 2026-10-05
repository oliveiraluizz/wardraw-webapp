import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Display, ErrorBox, Field, Input, Select, Textarea, ToggleChip } from "@/components/shared/ui";
import { useCatalog, useEventMutation } from "@/infra/hooks/queries";
import { eventsService } from "@/infra/services/events.service";
import type { EventPanel } from "@/types/domain";

const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: FormDataEntryValue | null) => (v ? new Date(String(v)).toISOString() : undefined);

/** RF-23: name, date, city, venue, modalities, amateur/pro, rules and fee (fee is shown, never charged). */
export function EventForm({ organizerProfileId, event }: { organizerProfileId?: string; event?: EventPanel }) {
  const { data: catalog } = useCatalog();
  const navigate = useNavigate();
  const [mods, setMods] = useState<string[]>(event?.modalityIds ?? []);
  const [cityId, setCityId] = useState<string>("");
  const save = useEventMutation((body: Record<string, unknown>) =>
    event ? eventsService.update(event.id, body) : eventsService.create({ ...body, organizerProfileId }),
  );
  const city = catalog?.cities.find((c) => c.id === cityId);

  return (
    <Card className="max-w-3xl">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const fee = f.get("fee");
          save.mutate(
            {
              name: f.get("name"),
              description: f.get("description") || undefined,
              startsAt: fromLocal(f.get("startsAt")),
              cityId: cityId || undefined,
              districtId: f.get("districtId") || undefined,
              venueName: f.get("venueName") || undefined,
              venueAddress: f.get("venueAddress") || undefined,
              level: f.get("level"),
              format: f.get("format"),
              modalityIds: mods,
              rulesText: f.get("rulesText") || undefined,
              registrationFeeCents: fee ? Math.round(Number(fee) * 100) : null,
              paymentInstructions: f.get("paymentInstructions") || undefined,
              registrationsCloseAt: fromLocal(f.get("registrationsCloseAt")),
              weighInAt: fromLocal(f.get("weighInAt")),
              weighInLocation: f.get("weighInLocation") || undefined,
            },
            { onSuccess: (r) => !event && navigate(`/organizador/${(r as EventPanel).id}/visao`) },
          );
        }}
      >
        {!event && <Display className="text-3xl">Novo evento</Display>}
        <Field label="Nome do evento">
          <Input name="name" required minLength={3} defaultValue={event?.name} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data e hora">
            <Input name="startsAt" type="datetime-local" required defaultValue={toLocal(event?.startsAt)} />
          </Field>
          <Field label="Inscrições até">
            <Input
              name="registrationsCloseAt"
              type="datetime-local"
              defaultValue={toLocal(event?.registrationsCloseAt)}
            />
          </Field>
          <Field label="Cidade">
            <Select value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">{event ? "Manter" : "Escolha"}</option>
              {catalog?.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bairro">
            <Select name="districtId">
              <option value="">—</option>
              {city?.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Local">
            <Input name="venueName" defaultValue={event?.venueName ?? ""} placeholder="Ginásio, CT..." />
          </Field>
          <Field label="Endereço">
            <Input name="venueAddress" defaultValue={event?.venueAddress ?? ""} />
          </Field>
          <Field label="Nível">
            <Select name="level" defaultValue={event?.level ?? "amateur"}>
              <option value="amateur">Amador</option>
              <option value="professional">Profissional</option>
              <option value="mixed">Amador e profissional</option>
            </Select>
          </Field>
          <Field label="Formato">
            <Select name="format" defaultValue={event?.format ?? "card"}>
              <option value="card">Card (MMA, Muay Thai, Boxe)</option>
              <option value="bracket">Chaves (Jiu-Jitsu)</option>
              <option value="mixed">Os dois</option>
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">Modalidades</span>
          <div className="flex flex-wrap gap-2">
            {catalog?.modalities.map((m) => (
              <ToggleChip
                key={m.id}
                selected={mods.includes(m.id)}
                onClick={() => setMods((v) => (v.includes(m.id) ? v.filter((x) => x !== m.id) : [...v, m.id]))}
              >
                {m.name}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Taxa de inscrição (R$)" hint="O Wardraw não recebe a taxa: só mostra o valor e as instruções.">
            <Input
              name="fee"
              inputMode="decimal"
              defaultValue={event?.registrationFeeCents != null ? String(event.registrationFeeCents / 100) : ""}
            />
          </Field>
          <Field label="Pesagem">
            <Input name="weighInAt" type="datetime-local" defaultValue={toLocal(event?.weighInAt)} />
          </Field>
        </div>
        <Field label="Instruções de pagamento">
          <Textarea
            name="paymentInstructions"
            defaultValue={event?.paymentInstructions ?? ""}
            placeholder="Pix: [chave]. Envie o comprovante pelo WhatsApp com seu nome e categoria."
          />
        </Field>
        <Field label="Local da pesagem">
          <Input name="weighInLocation" />
        </Field>
        <Field label="Descrição">
          <Textarea name="description" defaultValue={event?.description ?? ""} />
        </Field>
        <Field label="Regulamento">
          <Textarea name="rulesText" />
        </Field>
        {save.error && <ErrorBox error={save.error} />}
        <Button type="submit" size="lg" loading={save.isPending} disabled={!mods.length}>
          {event ? "Salvar alterações" : "Criar evento"}
        </Button>
      </form>
    </Card>
  );
}
