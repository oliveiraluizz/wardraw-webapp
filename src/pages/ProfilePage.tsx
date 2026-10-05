import { CheckCircle2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { ContactActions } from "@/components/flows/ContactActions";
import {
  Avatar,
  ButtonLink,
  Card,
  Chip,
  Display,
  ErrorBox,
  Notice,
  PageLoader,
  PhotoFrame,
  Stat,
} from "@/components/shared/ui";
import { usePublicProfile } from "@/infra/hooks/queries";
import type { PublicProfile, SimilarityInfo } from "@/types/domain";
import {
  ago,
  DAY_LABEL,
  measure,
  METHOD_LABEL,
  money,
  monthYear,
  PERIOD_LABEL,
  RESULT_LETTER,
  STANCE_LABEL,
} from "@/utils/format";
import { cn } from "@/utils/cn";

const UNIT: Record<string, string> = { session: "por sessão", camp_week: "por semana de camp", hour: "por hora" };

export default function ProfilePage() {
  const { slug } = useParams();
  const location = useLocation();
  const similarity = (location.state as { similarity?: SimilarityInfo } | null)?.similarity;
  const { data: p, isLoading, error } = usePublicProfile(slug);
  if (isLoading) return <PageLoader />;
  if (error || !p)
    return (
      <Container className="py-12">
        <ErrorBox error={error ?? new Error("Perfil não encontrado.")} />
      </Container>
    );

  const subtitle = [p.district ? `${p.district}, ${p.city}` : p.city, p.team, p.age ? `${p.age} anos` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <Container className="flex flex-col gap-6 py-8">
      <nav className="text-sm text-ink-muted" aria-label="Trilha">
        <Link to="/">Início</Link> /{" "}
        <Link to={p.type === "fighter" ? "/sparring" : "/servicos"}>
          {p.type === "fighter" ? "Sparring" : "Perfis"}
        </Link>{" "}
        / {p.displayName}
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        {p.type !== "fighter" && <Avatar name={p.displayName} url={p.avatarUrl} size={72} />}
        <div className="flex flex-col gap-2">
          <Display className="text-4xl lg:text-5xl">
            {p.fight_name ? (
              <>
                {p.displayName.split(" ")[0]} <span className="text-brand-hot">“{p.fight_name}”</span>{" "}
                {p.displayName.split(" ").slice(1).join(" ")}
              </>
            ) : (
              p.displayName
            )}
          </Display>
          <span className="text-ink-muted">{subtitle}</span>
          <div className="flex flex-wrap gap-1.5">
            {p.verifiedBadge && (
              <Chip tone="ok">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verificado
              </Chip>
            )}
            {(p.modalities ?? []).map((m) => (
              <Chip key={m}>{m}</Chip>
            ))}
            {p.stance && <Chip tone="hot">{STANCE_LABEL[p.stance]}</Chip>}
            {p.level && <Chip tone="gold">{p.level}</Chip>}
          </div>
        </div>
      </div>

      {p.requiresLogin ? (
        <Notice>
          Para ver o perfil completo, as fotos e o contato, entre na sua conta.{" "}
          <ButtonLink to={`/entrar?next=/p/${p.slug}`} size="sm" className="ml-2">
            Entrar
          </ButtonLink>
        </Notice>
      ) : p.type === "fighter" ? (
        <FighterBody p={p} similarity={similarity} />
      ) : (
        <GenericBody p={p} />
      )}
    </Container>
  );
}

function FighterBody({ p, similarity }: { p: PublicProfile; similarity?: SimilarityInfo }) {
  const photo = (k: string) => p.photos?.find((x) => x.kind === k)?.url;
  const days = p.availability?.days ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          {(["front", "side", "back"] as const).map((k) => (
            <figure key={k} className="flex flex-col gap-1">
              <PhotoFrame url={photo(k)} label={`Foto ${k}`} className="aspect-[3/4] w-full" />
              <figcaption className="text-center text-xs text-ink-muted">
                {{ front: "Frente", side: "Lado", back: "Costas" }[k]}
              </figcaption>
            </figure>
          ))}
        </div>
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value={p.height_cm && `${measure(p.height_cm)} cm`} label="Altura" />
          <Stat value={p.reach_cm && `${measure(p.reach_cm)} cm`} label="Envergadura" />
          <Stat
            value={p.fight_weight_kg && `${measure(p.fight_weight_kg)} kg`}
            label={`Peso de luta${p.weight_class ? ` · ${p.weight_class}` : ""}`}
          />
          <Stat
            value={p.current_weight_kg && `${measure(p.current_weight_kg)} kg`}
            label={`Peso atual${p.current_weight_at ? ` · ${ago(p.current_weight_at)}` : ""}`}
          />
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl uppercase">Estilo</h2>
          {[
            ["Modalidades", (p.modalities ?? []).join(", ")],
            ["Base", p.base_style],
            ["Guarda", p.stance && STANCE_LABEL[p.stance]],
            ["Nível", p.level],
            ["Graduação", p.graduation],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line pb-2 text-sm last:border-0">
              <span className="text-ink-muted">{k}</span>
              <span className="font-semibold">{v || "—"}</span>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl uppercase">Disponível para sparring</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {Object.entries(DAY_LABEL).map(([k, l]) => (
              <span
                key={k}
                className={cn(
                  "rounded-lg py-2 text-center text-sm font-semibold",
                  days.includes(k) ? "bg-ok-bg text-ok" : "bg-surface-2 text-ink-muted",
                )}
              >
                {l}
              </span>
            ))}
          </div>
          <p className="text-sm text-ink-soft">
            {(p.availability?.periods ?? []).map((x) => PERIOD_LABEL[x]).join(", ") || "Períodos não informados"}
            {p.availability?.radiusKm ? `. Até ${p.availability.radiusKm} km.` : "."}
            {p.availability?.travelsForCamp ? " Aceita viajar para camp." : ""}
          </p>
        </Card>
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl uppercase">Cartel</h2>
            <span className="font-cond text-2xl font-bold">
              {p.record_wins ?? 0}V · {p.record_losses ?? 0}D · {p.record_draws ?? 0}E
            </span>
          </div>
          {(p.recentFights ?? []).map((f, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line pb-2 text-sm last:border-0">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg font-cond font-bold",
                  f.result === "win"
                    ? "bg-ok-bg text-ok"
                    : f.result === "loss"
                      ? "bg-brand-deep text-brand-hot"
                      : "bg-surface-2 text-ink-muted",
                )}
              >
                {RESULT_LETTER[f.result]}
              </span>
              <span className="flex-1">
                vs. {f.opponentName}{" "}
                <span className="text-ink-muted">
                  {f.eventName ?? "Evento externo"} · {monthYear(f.date)}
                </span>
              </span>
              <span className="text-ink-muted">
                {f.method ? METHOD_LABEL[f.method] : ""}
                {f.round ? ` R${f.round}` : ""}
              </span>
            </div>
          ))}
          {!p.recentFights?.length && <p className="text-sm text-ink-muted">Nenhuma luta registrada.</p>}
        </Card>
      </div>
      <aside className="flex flex-col gap-4">
        {similarity && (
          <Card className="flex flex-col gap-2 border-gold-edge bg-gold-bg">
            <span className="font-cond text-4xl font-bold text-gold">{similarity.percent}%</span>
            <span className="text-sm text-gold-text">
              parecido com o adversário que você descreveu{similarity.summary ? `: ${similarity.summary}.` : "."}
            </span>
          </Card>
        )}
        {p.reference_price_cents != null && (
          <Card className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Valor de referência</span>
            <span className="font-cond text-2xl font-bold">
              {money(p.reference_price_cents)}{" "}
              <span className="text-base font-normal text-ink-muted">{UNIT[p.reference_price_unit ?? "session"]}</span>
            </span>
            <span className="text-xs text-ink-muted">
              Informado pelo atleta. Combine e pague direto com ele; a Wardraw não cobra comissão.
            </span>
          </Card>
        )}
        {!!p.coaches?.length && (
          <Card className="flex flex-col gap-2">
            <span className="font-bold">Time e coaches</span>
            <span className="text-sm text-ink-soft">{p.team}</span>
            {p.coaches.map((c) => (
              <Link key={c.id} to={`/p/${c.slug}`} className="flex items-center gap-2 text-sm hover:text-brand-hot">
                <Avatar name={c.display_name} size={32} /> {c.display_name}
              </Link>
            ))}
          </Card>
        )}
        <ContactActions targetId={p.id} targetType={p.type} compare />
      </aside>
    </div>
  );
}

function GenericBody({ p }: { p: PublicProfile }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        {p.bio && <p className="max-w-3xl text-lg text-ink-soft">{p.bio}</p>}
        {!!p.categories?.length && (
          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-2xl uppercase">Serviços</h2>
            {p.categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.professional_title ?? c.name}</span>
                {c.verification_status === "verified" && <Chip tone="ok">Registro verificado</Chip>}
              </div>
            ))}
          </Card>
        )}
        {p.servedAthletes && (
          <Card className="flex flex-col gap-2">
            <span className="font-bold">Atendeu {p.servedAthletes.total} atletas</span>
            <div className="flex flex-wrap gap-2">
              {p.servedAthletes.featured.map((a) => (
                <Link key={a.id} to={`/p/${a.slug}`} className="text-sm text-brand-hot">
                  {a.display_name}
                </Link>
              ))}
            </div>
          </Card>
        )}
        {!!p.portfolio?.length && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {p.portfolio.map((i) =>
              i.publicUrl ? (
                <img
                  key={i.id}
                  src={i.publicUrl}
                  alt={i.title ?? "Portfólio"}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ) : (
                <a
                  key={i.id}
                  href={i.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square items-center justify-center rounded-xl border border-line bg-surface p-3 text-center text-sm text-brand-hot"
                >
                  {i.title ?? "Ver trabalho"}
                </a>
              ),
            )}
          </div>
        )}
        {!!p.eventsWorked?.length && (
          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-2xl uppercase">Eventos em que trabalhou</h2>
            {p.eventsWorked.map((e) => (
              <Link key={e.id} to={`/eventos/${e.slug}`} className="text-sm hover:text-brand-hot">
                {e.name} · {e.role}
              </Link>
            ))}
          </Card>
        )}
        {!!p.teams?.length && (
          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-2xl uppercase">Times</h2>
            {p.teams.map((t) => (
              <span key={t.id} className="text-sm">
                {t.name}
              </span>
            ))}
          </Card>
        )}
        {!!p.events?.length && (
          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-2xl uppercase">Eventos</h2>
            {p.events.map((e) => (
              <Link key={e.id} to={`/eventos/${e.slug}`} className="text-sm hover:text-brand-hot">
                {e.name}
              </Link>
            ))}
          </Card>
        )}
      </div>
      <aside>
        <ContactActions
          targetId={p.id}
          targetType={p.type}
          context={p.type === "provider" ? "service_search" : "profile"}
        />
      </aside>
    </div>
  );
}
