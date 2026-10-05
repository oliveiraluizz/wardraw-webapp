import { CalendarCog, ClipboardList, ExternalLink, GitBranch, Plus, Swords, Trophy, Users } from "lucide-react";
import { NavLink, Route, Routes, useParams } from "react-router-dom";
import { ButtonLink, Card, Display, EmptyState, ErrorBox, Eyebrow, PageLoader } from "@/components/shared/ui";
import { useCatalog, useEventPanel, useMe, useMyEvents } from "@/infra/hooks/queries";
import { cn } from "@/utils/cn";
import { eventDate } from "@/utils/format";
import { BracketsTab } from "./BracketsTab";
import { CardTab } from "./CardTab";
import { eventFlow } from "./eventFlow";
import { EventForm } from "./EventForm";
import { OverviewTab } from "./OverviewTab";
import { RegistrationsTab } from "./RegistrationsTab";
import { ResultsTab, StaffTab } from "./ResultsStaffTabs";

export default function OrganizerPage() {
  const { data: me, isLoading } = useMe();
  const organizer = me?.profiles.find((p) => p.type === "organizer");
  const { data: events } = useMyEvents(!!me);
  if (isLoading) return <PageLoader />;
  if (!organizer)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Organize seus eventos aqui">
          Inscrições, chaves de Jiu-Jitsu, card de MMA, pesagem e resultados num lugar só.
          <div className="mt-4 flex justify-center gap-2">
            <ButtonLink to="/conta/perfis/novo?tipo=organizer">Criar perfil de organizador</ButtonLink>
            <ButtonLink to="/planos?tipo=organizer" variant="secondary">
              Ver planos
            </ButtonLink>
          </div>
        </EmptyState>
      </div>
    );

  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col lg:flex-row">
      <aside className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-6 lg:w-[260px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Meus eventos</Eyebrow>
          {events?.map((e) => (
            <NavLink
              key={e.id}
              to={`/organizador/${e.id}/inscricoes`}
              className={({ isActive }) =>
                cn("flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5", isActive ? "bg-surface-2" : "hover:bg-surface-2")
              }
            >
              <span className="text-sm font-bold">{e.name}</span>
              <span className="text-xs text-ink-muted">
                {eventDate(e.starts_at, false)} · {e.modalities}
              </span>
            </NavLink>
          ))}
          <NavLink to="/organizador/novo" className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold">
            <Plus className="h-4 w-4" /> Novo evento
          </NavLink>
        </div>
        <Routes>
          <Route path=":eventId/*" element={<EventNav />} />
        </Routes>
        <div className="flex-1" />
        {organizer.plan ? (
          <div className="flex flex-col gap-1 rounded-xl border border-gold-edge bg-gold-bg p-3">
            <span className="text-xs font-bold uppercase text-gold">Plano {organizer.plan.name}</span>
            <span className="text-[13px] text-gold-text">
              {organizer.features["events.active_per_month"] === null
                ? "Eventos ilimitados"
                : `Até ${String(organizer.features["events.active_per_month"])} evento(s) por mês`}
              {organizer.features["comparison.any_pair"] === true ? " e comparação para casar lutas" : ""}
            </span>
          </div>
        ) : (
          <ButtonLink to="/planos?tipo=organizer" size="sm">
            Escolher plano
          </ButtonLink>
        )}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-10">
        <Routes>
          <Route index element={<Welcome hasEvents={!!events?.length} />} />
          <Route path="novo" element={<EventForm organizerProfileId={organizer.id} />} />
          <Route path=":eventId/*" element={<EventWorkspace />} />
        </Routes>
      </main>
    </div>
  );
}

const SECTIONS = [
  { to: "visao", label: "Visão geral", icon: CalendarCog },
  { to: "inscricoes", label: "Inscrições", icon: ClipboardList },
  { to: "chaves", label: "Chaves e pesagem", icon: GitBranch },
  { to: "card", label: "Card e pesagem", icon: Swords },
  { to: "resultados", label: "Resultados do card", icon: Trophy },
  { to: "equipe", label: "Equipe de trabalho", icon: Users },
];

function EventNav() {
  const { eventId } = useParams();
  const { data: e } = useEventPanel(eventId);
  const { data: catalog } = useCatalog();
  // Only the sections this event uses: an MMA card has no brackets, a Jiu-Jitsu open has no card.
  const visible = e ? eventFlow(e, catalog).sections : SECTIONS.map((s) => s.to);
  return (
    <>
      <div className="h-px bg-line" />
      <nav aria-label="Gestão do evento" className="flex flex-col gap-1">
        {SECTIONS.filter((s) => visible.includes(s.to)).map((s) => (
          <NavLink
            key={s.to}
            to={`/organizador/${eventId}/${s.to}`}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-[15px]",
                isActive ? "bg-brand font-bold" : "font-medium hover:bg-surface-2",
              )
            }
          >
            <s.icon className="h-[18px] w-[18px]" aria-hidden /> {s.label}
          </NavLink>
        ))}
        {e && ["published", "registrations_closed", "finished"].includes(e.status) && (
          <a
            href={`/eventos/${e.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-[15px] font-medium hover:bg-surface-2"
          >
            <ExternalLink className="h-[18px] w-[18px]" aria-hidden /> Página pública
          </a>
        )}
      </nav>
    </>
  );
}

function Welcome({ hasEvents }: { hasEvents: boolean }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Display className="text-4xl">Painel do organizador</Display>
      <p className="text-ink-soft">
        {hasEvents
          ? "Escolha um evento na lateral para gerenciar."
          : "Crie seu primeiro evento: depois é só abrir as inscrições."}
      </p>
      <ButtonLink to="/organizador/novo" className="self-start">
        Novo evento
      </ButtonLink>
    </div>
  );
}

function EventWorkspace() {
  const { eventId = "" } = useParams();
  const { data: e, isLoading, error } = useEventPanel(eventId);
  const { data: catalog } = useCatalog();
  if (isLoading) return <PageLoader />;
  if (error || !e) return <ErrorBox error={error} />;
  const flow = eventFlow(e, catalog);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>
          {eventDate(e.startsAt, false)} · {e.venueName ?? ""}
        </Eyebrow>
        <Display className="text-3xl lg:text-[40px]">{e.name}</Display>
      </div>
      <Card className="flex flex-wrap gap-2 p-2">
        {flow.steps.map((s, i) => (
          <NavLink
            key={s.label}
            to={`/organizador/${e.id}/${s.to}`}
            className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-ink-soft hover:bg-surface-3 hover:text-ink"
          >
            {i + 1}. {s.label}
          </NavLink>
        ))}
      </Card>
      <Routes>
        <Route path="visao" element={<OverviewTab event={e} />} />
        <Route path="inscricoes" element={<RegistrationsTab event={e} />} />
        <Route path="chaves" element={<BracketsTab event={e} />} />
        <Route path="card" element={<CardTab event={e} />} />
        <Route path="resultados" element={<ResultsTab event={e} />} />
        <Route path="equipe" element={<StaffTab event={e} />} />
        <Route path="*" element={<OverviewTab event={e} />} />
      </Routes>
    </div>
  );
}
