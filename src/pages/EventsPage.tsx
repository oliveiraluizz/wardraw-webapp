import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { EventRowCard } from "@/components/flows/cards";
import {
  ButtonLink,
  Card,
  Display,
  EmptyState,
  ErrorBox,
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { useAgenda, useCatalog } from "@/infra/hooks/queries";
import { cn } from "@/utils/cn";

export default function EventsPage() {
  const { data: catalog } = useCatalog();
  const [cityId, setCityId] = useState<string>("");
  const [modalityId, setModalityId] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);

  const query = {
    cityId: cityId || undefined,
    modalityId: modalityId || undefined,
    level: level || undefined,
    from: month.toISOString(),
  };
  const { data, isLoading, error } = useAgenda(query);
  const events = data?.results ?? [];

  const days = useMemo(() => eachDayOfInterval({ start: month, end: endOfMonth(month) }), [month]);
  const hasEvent = (d: Date) => events.some((e) => isSameDay(parseISO(e.starts_at), d));
  const dayEvents = selected ? events.filter((e) => isSameDay(parseISO(e.starts_at), selected)) : [];
  const upcoming = selected ? events.filter((e) => !isSameDay(parseISO(e.starts_at), selected)) : events;

  return (
    <Container className="flex flex-col gap-6 py-8">
      <nav className="text-sm text-ink-muted" aria-label="Trilha">
        <Link to="/">Início</Link> / Eventos
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Display className="text-4xl lg:text-5xl">Agenda de eventos</Display>
        <Select className="w-60" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="Cidade">
          <option value="">Todas as cidades</option>
          {catalog?.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <ToggleChip selected={!modalityId && !level} onClick={() => (setModalityId(""), setLevel(""))}>
          Todos
        </ToggleChip>
        {catalog?.modalities.map((m) => (
          <ToggleChip
            key={m.id}
            selected={modalityId === m.id}
            onClick={() => setModalityId(modalityId === m.id ? "" : m.id)}
          >
            {m.name}
          </ToggleChip>
        ))}
        <ToggleChip selected={level === "amateur"} onClick={() => setLevel(level === "amateur" ? "" : "amateur")}>
          Amador
        </ToggleChip>
        <ToggleChip
          selected={level === "professional"}
          onClick={() => setLevel(level === "professional" ? "" : "professional")}
        >
          Pro
        </ToggleChip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-surface-2"
                onClick={() => (setMonth(addMonths(month, -1)), setSelected(null))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-display text-xl uppercase">{format(month, "MMMM yyyy", { locale: ptBR })}</span>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-surface-2"
                onClick={() => (setMonth(addMonths(month, 1)), setSelected(null))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="py-1 text-xs font-semibold text-ink-muted">
                  {d}
                </span>
              ))}
              {Array.from({ length: getDay(month) }).map((_, i) => (
                <span key={`pad${i}`} />
              ))}
              {days.map((d) => {
                const active = selected && isSameDay(d, selected);
                const marked = hasEvent(d);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelected(active ? null : d)}
                    className={cn(
                      "relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold",
                      active
                        ? "bg-brand text-white"
                        : marked
                          ? "bg-brand-deep text-brand-hot"
                          : "text-ink-soft hover:bg-surface-2",
                    )}
                    aria-pressed={!!active}
                    aria-label={`${format(d, "d 'de' MMMM", { locale: ptBR })}${marked ? ", tem evento" : ""}`}
                  >
                    {format(d, "d")}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="flex flex-col gap-3 border-brand-edge bg-brand-deep">
            <span className="font-bold">Organiza eventos?</span>
            <p className="text-sm text-ink-soft">
              Publique na agenda, encontre lutadores para o card e contrate arbitragem, som e luz.
            </p>
            <ButtonLink to="/organizador" variant="secondary">
              Cadastrar evento
            </ButtonLink>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {error && <ErrorBox error={error} />}
          {isLoading && <PageLoader />}
          {selected && (
            <section className="flex flex-col gap-3">
              <h2 className="font-cond text-lg font-semibold uppercase tracking-wide text-ink-soft">
                {format(selected, "EEEE, d 'de' MMMM", { locale: ptBR })} · {dayEvents.length} evento
                {dayEvents.length === 1 ? "" : "s"}
              </h2>
              {dayEvents.map((e) => (
                <EventRowCard key={e.id} event={e} />
              ))}
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="font-cond text-lg font-semibold uppercase tracking-wide text-ink-soft">Próximos</h2>
            {upcoming.map((e) => (
              <EventRowCard key={e.id} event={e} />
            ))}
            {!isLoading && !error && !events.length && (
              <EmptyState title="Nenhum evento">Ainda não há eventos publicados com esses filtros.</EmptyState>
            )}
          </section>
        </div>
      </div>
    </Container>
  );
}
