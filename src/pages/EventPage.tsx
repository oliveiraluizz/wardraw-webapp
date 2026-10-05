import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Display,
  EmptyState,
  ErrorBox,
  Eyebrow,
  Field,
  Modal,
  Notice,
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useEventMutation, useEventPage, useMe } from "@/infra/hooks/queries";
import { get } from "@/infra/api/client";
import { eventsService, teamsService } from "@/infra/services/events.service";
import type { CardBout, EventPage as EventPageData } from "@/types/domain";
import { cn } from "@/utils/cn";
import { eventDate, LEVEL_LABEL, measure, METHOD_LABEL, money } from "@/utils/format";

type Tab = "card" | "teams" | "staff" | "results";

export default function EventPage() {
  const { slug } = useParams();
  const { data: e, isLoading, error } = useEventPage(slug);
  const [tab, setTab] = useState<Tab>("card");
  const [registering, setRegistering] = useState(false);
  if (isLoading) return <PageLoader />;
  if (error || !e)
    return (
      <Container className="py-12">
        <ErrorBox error={error ?? new Error("Evento não encontrado.")} />
      </Container>
    );

  const finished = e.card.filter((b) => b.status === "finished");
  return (
    <>
      <section
        className="bg-gradient-to-br from-[#3A0E16] to-bg bg-cover bg-center"
        style={
          e.posterUrl
            ? { backgroundImage: `linear-gradient(0deg, #0F0F11, rgba(15,15,17,.6)), url(${e.posterUrl})` }
            : undefined
        }
      >
        <Container className="flex flex-col gap-3 py-12">
          <Eyebrow>
            {LEVEL_LABEL[e.level]} ·{" "}
            {e.divisions
              .map((d) => d.modality)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ") || e.format.toUpperCase()}
          </Eyebrow>
          <Display className="text-4xl lg:text-6xl">{e.name}</Display>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> {eventDate(e.startsAt)}
              {e.weighInAt && ` · pesagem ${eventDate(e.weighInAt)}`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {[e.venueName, e.venueAddress].filter(Boolean).join(", ")}
            </span>
          </div>
          <span className="text-sm text-ink-muted">
            Organizado por{" "}
            <Link to={`/p/${e.organizer.slug}`} className="text-brand-hot">
              {e.organizer.display_name}
            </Link>
          </span>
          {e.registrationsOpen && (
            <Button size="lg" className="mt-2 self-start" onClick={() => setRegistering(true)}>
              Inscrever-se
            </Button>
          )}
        </Container>
      </section>
      <Container className="grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {(
              [
                ["card", "Card"],
                ["teams", "Times"],
                ["staff", "Equipe"],
                ["results", "Resultados"],
              ] as const
            ).map(([k, l]) => (
              <ToggleChip key={k} role="tab" selected={tab === k} onClick={() => setTab(k)}>
                {l}
              </ToggleChip>
            ))}
          </div>
          {tab === "card" &&
            (e.card.length ? (
              e.card.map((b, i) => (
                <BoutRow
                  key={b.id}
                  bout={b}
                  label={b.label ?? (i === 0 ? "Luta principal" : i === 1 ? "Co-principal" : undefined)}
                />
              ))
            ) : (
              <Divisions e={e} />
            ))}
          {tab === "teams" &&
            (e.teams.length ? (
              e.teams.map((t) => (
                <Card key={t.id} className="flex items-center gap-3">
                  <Avatar name={t.name} size={40} />
                  <span className="flex-1 font-bold">{t.name}</span>
                  <Chip>{t.fighters} atletas</Chip>
                </Card>
              ))
            ) : (
              <EmptyState title="Ainda sem times" />
            ))}
          {tab === "staff" &&
            (e.staff.length ? (
              e.staff.map((s) => (
                <Card key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.display_name} size={40} />
                  <Link to={`/p/${s.slug}`} className="flex-1 font-bold hover:text-brand-hot">
                    {s.display_name}
                  </Link>
                  <Chip tone="gold">{s.role}</Chip>
                </Card>
              ))
            ) : (
              <EmptyState title="Equipe ainda não divulgada" />
            ))}
          {tab === "results" &&
            (finished.length ? (
              finished.map((b) => <BoutRow key={b.id} bout={b} />)
            ) : (
              <EmptyState title="Resultados saem depois do evento" />
            ))}
        </div>
        <aside className="flex flex-col gap-4">
          {e.registrationFeeCents != null && (
            <Card className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Taxa de inscrição</span>
              <span className="font-cond text-2xl font-bold">
                {e.registrationFeeText || money(e.registrationFeeCents)}
              </span>
              <span className="text-xs text-ink-muted">
                Definida pelo organizador. O Wardraw não recebe nem intermedeia valores.
              </span>
            </Card>
          )}
          {e.description && <Card className="text-sm text-ink-soft">{e.description}</Card>}
        </aside>
      </Container>
      {registering && <RegisterModal event={e} onClose={() => setRegistering(false)} />}
    </>
  );
}

function BoutRow({ bout: b, label }: { bout: CardBout; label?: string }) {
  const winner = (side: "a" | "b") => b.status === "finished" && b.winner_side === side;
  const side = (
    name: string | null,
    slug: string | null | undefined,
    team: string | null | undefined,
    won: boolean,
  ) => (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Avatar name={name ?? "?"} size={40} />
      <div className="flex min-w-0 flex-col">
        {slug ? (
          <Link to={`/p/${slug}`} className={cn("truncate font-bold", won && "text-ok")}>
            {name}
          </Link>
        ) : (
          <span className="text-ink-muted">A definir</span>
        )}
        <span className="truncate text-xs text-ink-muted">{team ?? "Independente"}</span>
      </div>
    </div>
  );
  return (
    <Card className="flex flex-col gap-2">
      {label && <Eyebrow className="text-brand-hot">{label}</Eyebrow>}
      <div className="flex items-center gap-3">
        {side(b.a_name, b.a_slug, b.a_team, winner("a"))}
        <span className="font-display text-xl text-ink-muted">VS</span>
        <div className="flex flex-1 justify-end text-right">{side(b.b_name, b.b_slug, b.b_team, winner("b"))}</div>
      </div>
      <span className="text-xs text-ink-muted">
        {[
          b.weight_class,
          b.weight_limit_kg && `${measure(b.weight_limit_kg)} kg`,
          `${b.rounds} x ${b.round_minutes} min`,
        ]
          .filter(Boolean)
          .join(" · ")}
        {b.status === "finished" &&
          b.method &&
          ` · ${METHOD_LABEL[b.method]}${b.result_round ? ` R${b.result_round}` : ""}`}
      </span>
    </Card>
  );
}

function Divisions({ e }: { e: EventPageData }) {
  if (!e.divisions.length) return <EmptyState title="Card ainda não divulgado" />;
  return (
    <div className="flex flex-col gap-2">
      {e.divisions.map((d) => (
        <Card key={d.id} className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold">{d.name}</span>
            <span className="text-xs text-ink-muted">{d.modality}</span>
          </div>
          <Chip>{d.registrations} inscritos</Chip>
        </Card>
      ))}
    </div>
  );
}

/** Screen "Inscrição em evento": me or an athlete of my team, suggested category, fee instructions and progress. */
function RegisterModal({ event: e, onClose }: { event: EventPageData; onClose: () => void }) {
  const { session } = useAuth();
  const { data: me } = useMe();
  const fighter = me?.profiles.find((p) => p.type === "fighter");
  const coach = me?.profiles.find((p) => p.type === "coach");
  const [who, setWho] = useState<"me" | "team">(fighter ? "me" : "team");
  const [athleteId, setAthleteId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const athletes = useQuery({
    queryKey: ["myAthletes"],
    queryFn: teamsService.myAthletes,
    enabled: !!coach && who === "team",
  });
  const fighterId = who === "me" ? fighter?.id : athleteId;
  const suggestions = useQuery({
    queryKey: ["suggest", e.id, fighterId],
    queryFn: () =>
      get<{ id: string; name: string; eligible: boolean; problems: string[] }[]>(
        `/events/${e.id}/divisions/suggest/${fighterId}`,
      ),
    enabled: !!fighterId,
  });
  const register = useEventMutation(() =>
    eventsService.register(e.id, {
      divisionId,
      fighterProfileId: fighterId,
      asProfileId: who === "team" ? coach?.id : undefined,
    }),
  );

  if (!session)
    return (
      <Modal open onClose={onClose} title="Inscrição">
        <Notice>
          Entre na sua conta para se inscrever.{" "}
          <Link to={`/entrar?next=/eventos/${e.slug}`} className="font-bold underline">
            Entrar
          </Link>
        </Notice>
      </Modal>
    );

  return (
    <Modal open onClose={onClose} title="Inscrição">
      {register.isSuccess ? (
        <div className="flex flex-col gap-3">
          <Notice tone="ok">Inscrição enviada. O organizador recebe um aviso.</Notice>
          <Timeline />
          {e.paymentInstructions && <Notice>{e.paymentInstructions}</Notice>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {fighter && (
              <ToggleChip selected={who === "me"} onClick={() => setWho("me")}>
                Eu mesmo
              </ToggleChip>
            )}
            {coach && (
              <ToggleChip selected={who === "team"} onClick={() => setWho("team")}>
                Atleta do meu time
              </ToggleChip>
            )}
          </div>
          {!fighter && !coach && <Notice>Crie um perfil de lutador ou de coach para se inscrever.</Notice>}
          {who === "team" && coach && (
            <Field label="Atleta">
              <Select value={athleteId} onChange={(ev) => (setAthleteId(ev.target.value), setDivisionId(""))}>
                <option value="">{athletes.isLoading ? "Carregando atletas…" : "Escolha o atleta"}</option>
                {athletes.data?.map((a) => (
                  <option key={a.profile_id} value={a.profile_id}>
                    {a.display_name} · {a.team}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {suggestions.data && (
            <Field label="Categoria">
              <Select value={divisionId} onChange={(ev) => setDivisionId(ev.target.value)}>
                <option value="">Escolha a categoria</option>
                {suggestions.data.map((d) => (
                  <option key={d.id} value={d.id} disabled={!d.eligible}>
                    {d.name}
                    {d.eligible ? " · sugerida pelo seu perfil" : ` (${d.problems[0]})`}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {suggestions.error && <ErrorBox error={suggestions.error} />}
          <Card className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Taxa de inscrição</span>
            <span className="font-cond text-xl font-bold">
              {e.registrationFeeText || money(e.registrationFeeCents)} definida pelo organizador
            </span>
            {e.paymentInstructions && (
              <span className="text-sm text-ink-soft">Instruções do organizador: {e.paymentInstructions}</span>
            )}
            <span className="text-xs text-ink-muted">
              O pagamento é combinado direto com o organizador. O Wardraw não recebe nem intermedeia valores.
            </span>
          </Card>
          <Timeline />
          {register.error && <ErrorBox error={register.error} />}
          <Button
            size="lg"
            disabled={!divisionId || !fighterId}
            loading={register.isPending}
            onClick={() => register.mutate(undefined)}
          >
            Enviar inscrição
          </Button>
        </div>
      )}
    </Modal>
  );
}

const Timeline = () => (
  <ol className="flex flex-col gap-2 border-l border-line pl-4 text-sm">
    {[
      ["Inscrição enviada", "O organizador recebe um aviso"],
      ["Aprovada pelo organizador", "Você recebe um aviso"],
      ["Pagamento confirmado", "O organizador marca como pago"],
      ["Chave publicada", "Você vê seu primeiro adversário"],
    ].map(([t, d]) => (
      <li key={t}>
        <span className="font-bold">{t}</span> <span className="text-ink-muted">· {d}</span>
      </li>
    ))}
  </ol>
);
