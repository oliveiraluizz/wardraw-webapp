import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { AgendaEvent, ProviderResult, PublicPlan, SparringResult } from "@/types/domain";
import { cn } from "@/utils/cn";
import { availabilitySummary, dayBadge, eventDate, LEVEL_LABEL, measure, money, STANCE_LABEL } from "@/utils/format";
import { Avatar, Chip, PhotoFrame, SimilarityBadge, Stat } from "../shared/ui";

/** Date tile used in agenda lists ("15 NOV"). */
export const DateTile = ({ date, className }: { date: string; className?: string }) => {
  const { day, month } = dayBadge(date);
  return (
    <div
      className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2", className)}
    >
      <span className="font-cond text-2xl font-bold leading-none">{day}</span>
      <span className="font-cond text-xs font-semibold uppercase text-brand-hot">{month}</span>
    </div>
  );
};

/** Big poster card (Início / agenda): gradient poster + chips bar. */
export function EventPosterCard({ event }: { event: AgendaEvent }) {
  return (
    <Link
      to={`/eventos/${event.slug}`}
      className="flex flex-col overflow-hidden rounded-[18px] border border-brand-edge text-ink transition-transform hover:-translate-y-0.5"
    >
      <div
        className="flex h-[170px] flex-col justify-end gap-1.5 bg-gradient-to-br from-[#3A0E16] to-[#121214] bg-cover bg-center p-4"
        style={
          event.posterUrl
            ? {
                backgroundImage: `linear-gradient(0deg, rgba(15,15,17,.9), rgba(15,15,17,.1)), url(${event.posterUrl})`,
              }
            : undefined
        }
      >
        <div className="font-cond text-[13px] font-semibold uppercase tracking-[1.2px] text-ink-muted">
          {eventDate(event.starts_at, false)} · {event.district ?? event.city}
        </div>
        <span className="font-display text-3xl uppercase leading-none">{event.name}</span>
      </div>
      <div className="flex items-center justify-between bg-brand-deep px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {(event.modalities ?? []).slice(0, 2).map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
          <Chip tone="gold">{LEVEL_LABEL[event.level]}</Chip>
          {event.bouts > 0 && <Chip>{event.bouts} lutas</Chip>}
        </div>
        <span className="text-sm font-bold text-brand-hot">
          {event.registrations_open ? "Inscrever-se" : "Ver card"} →
        </span>
      </div>
    </Link>
  );
}

/** Row card for agenda lists (web agenda, "Próximos"). */
export function EventRowCard({ event }: { event: AgendaEvent }) {
  return (
    <Link
      to={`/eventos/${event.slug}`}
      className={cn(
        "flex gap-4 rounded-card border bg-surface p-4 hover:bg-surface-2",
        event.highlighted ? "border-gold-edge" : "border-line",
      )}
    >
      <DateTile date={event.starts_at} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">{event.name}</span>
          {event.highlighted && <Chip tone="gold">Destaque</Chip>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(event.modalities ?? []).map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
          <Chip tone="gold">{LEVEL_LABEL[event.level]}</Chip>
          {event.registrations_open ? (
            <Chip tone="ok">Inscrições abertas</Chip>
          ) : event.bouts > 0 ? (
            <Chip>Card com {event.bouts} lutas</Chip>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" aria-hidden /> {eventDate(event.starts_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" aria-hidden />{" "}
            {[event.venue_name, event.district ?? event.city].filter(Boolean).join(", ")}
          </span>
          {event.registrations_open && event.registrations_close_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden /> Inscrições até{" "}
              {new Date(event.registrations_close_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** RF-16: fighter result card with photo, main measures, city and similarity. */
export function FighterCard({ fighter, compact }: { fighter: SparringResult; compact?: boolean }) {
  const kinds = compact ? (["front"] as const) : (["front", "side", "back"] as const);
  return (
    <Link
      to={`/p/${fighter.slug}`}
      state={fighter.similarity ? { similarity: fighter.similarity } : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-surface p-3.5 text-ink hover:bg-surface-2",
        fighter.highlighted ? "border-gold-edge" : "border-line",
      )}
    >
      <div className="flex gap-3">
        <div className="flex gap-1.5">
          {kinds.map((k) => (
            <PhotoFrame key={k} url={fighter.photos[k]} label={`Foto ${k}`} className="h-24 w-[76px] shrink-0" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[17px] font-bold">{fighter.displayName}</span>
              <span className="truncate text-[13px] text-ink-muted">
                {fighter.fightName ? `“${fighter.fightName}” · ` : ""}
                {fighter.team}
                {fighter.district ? ` · ${fighter.district}` : ""}
              </span>
            </div>
            {fighter.similarity && <SimilarityBadge percent={fighter.similarity.percent} />}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {fighter.stance && <Chip tone="hot">{STANCE_LABEL[fighter.stance]}</Chip>}
            {fighter.baseStyle && <Chip>{fighter.baseStyle}</Chip>}
            {fighter.level && (
              <Chip tone="gold">
                {fighter.level === "Profissional" ? "Pro" : fighter.level} {fighter.record.wins}-{fighter.record.losses}
              </Chip>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-line pt-2.5">
        <Stat value={measure(fighter.heightCm)} label="Altura" />
        <Stat value={measure(fighter.reachCm)} label="Envergad." />
        <Stat value={measure(fighter.fightWeightKg)} label="Peso luta" />
        <Stat value={measure(fighter.currentWeightKg)} label="Peso atual" />
      </div>
      <div className="flex items-center gap-1.5 text-[13px] text-ok">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        <span>
          {availabilitySummary(fighter.availability)}
          {fighter.distanceKm != null ? ` · ${fighter.distanceKm} km` : ""}
        </span>
      </div>
    </Link>
  );
}

export function ProviderCard({ provider, onWhatsapp }: { provider: ProviderResult; onWhatsapp?: () => void }) {
  const main = provider.categories?.[0];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-surface p-4",
        provider.highlighted ? "border-gold-edge" : "border-line",
      )}
    >
      <div className="flex gap-3">
        <Avatar name={provider.display_name} url={provider.avatarUrl} size={52} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link to={`/p/${provider.slug}`} className="text-[17px] font-bold hover:text-brand-hot">
            {provider.display_name}
          </Link>
          <span className="text-[13px] text-ink-muted">
            {main?.title ?? "Prestador"} · {provider.district ?? provider.city}
          </span>
        </div>
        {provider.highlighted && <Chip tone="gold">Destaque</Chip>}
      </div>
      {provider.bio && <p className="line-clamp-2 text-sm text-ink-soft">{provider.bio}</p>}
      <div className="flex flex-wrap gap-1.5">
        {provider.categories
          ?.filter((c) => c.verified)
          .map((c) => (
            <Chip key={c.id} tone="ok">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {c.name} verificado
            </Chip>
          ))}
        {provider.athletes_served > 0 && <Chip tone="ink">{provider.athletes_served} atletas atendidos</Chip>}
        {provider.events_worked > 0 && <Chip tone="ink">{provider.events_worked} eventos</Chip>}
        {(provider.modalities ?? []).map((m) => (
          <Chip key={m}>{m}</Chip>
        ))}
      </div>
      {onWhatsapp && (
        <button
          type="button"
          onClick={onWhatsapp}
          className="min-h-11 rounded-xl border border-ok-edge bg-ok-bg text-[15px] font-bold text-ok hover:brightness-110"
        >
          Chamar no WhatsApp
        </button>
      )}
    </div>
  );
}

export function PlanCard({
  plan,
  interval,
  onPick,
  current,
}: {
  plan: PublicPlan;
  interval: "month" | "year";
  onPick: (priceId: string) => void;
  current?: boolean;
}) {
  const price = plan.prices.find((p) => p.billingInterval === interval) ?? plan.prices[0];
  const featured = !!plan.highlightLabel;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border p-5",
        featured ? "border-brand-hot bg-brand-deep" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-2xl uppercase">{plan.name}</span>
        {plan.highlightLabel && <Chip tone="hot">{plan.highlightLabel}</Chip>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-cond text-4xl font-bold">{money(price?.amountCents)}</span>
        <span className="text-sm text-ink-muted">/ {interval === "year" ? "ano" : "mês"}</span>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {plan.highlights.map((h) => (
          <li key={h} className="flex gap-2 text-sm text-ink-soft">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
            {h}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={current || !price}
        onClick={() => price && onPick(price.id)}
        className={cn(
          "min-h-12 rounded-xl text-[15px] font-bold disabled:opacity-60",
          featured
            ? "bg-brand text-white hover:bg-[#a90d27]"
            : "border border-line bg-surface-2 text-white hover:bg-surface-3",
        )}
      >
        {current ? "Seu plano atual" : "Começar período de teste"}
      </button>
    </div>
  );
}
