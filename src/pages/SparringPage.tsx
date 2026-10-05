import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { FighterCard } from "@/components/flows/cards";
import { OpponentForm, opponentToSearch, type OpponentParams } from "@/components/flows/OpponentForm";
import {
  Button,
  ButtonLink,
  Card,
  Display,
  EmptyState,
  ErrorBox,
  Input,
  Modal,
  Notice,
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/infra/api/client";
import { useCatalog, useSparringSearch } from "@/infra/hooks/queries";
import { useActiveProfile } from "@/infra/hooks/useActiveProfile";
import type { SparringQuery } from "@/infra/services/search.service";
import { STANCE_LABEL } from "@/utils/format";

const num = (v: string | null): number | undefined => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export default function SparringPage() {
  const { session } = useAuth();
  const { profile, isLoading: loadingMe } = useActiveProfile(["fighter", "coach", "organizer"]);
  const { data: catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);

  const opponent: OpponentParams = Object.fromEntries(
    ["h", "r", "w", "stance", "base", "level", "city"].map((k) => [k, params.get(k) ?? undefined]),
  );
  const hasOpponent = !!(opponent.h || opponent.r || opponent.w || opponent.stance || opponent.base);
  const list = (k: string) => params.getAll(k);
  const toggle = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    const values = next.getAll(k);
    next.delete(k);
    (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]).forEach((x) => next.append(k, x));
    next.delete("page");
    setParams(next);
  };
  const setOne = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("page");
    setParams(next);
  };

  const query = useMemo<SparringQuery | null>(() => {
    if (!profile) return null;
    const range = (min: string, max: string) =>
      params.get(min) || params.get(max) ? { min: num(params.get(min)), max: num(params.get(max)) } : undefined;
    return {
      asProfileId: profile.id,
      mode: hasOpponent ? "opponent" : "filters",
      opponent: hasOpponent
        ? {
            heightCm: num(opponent.h ?? null),
            reachCm: num(opponent.r ?? null),
            fightWeightKg: num(opponent.w ?? null),
            stance: opponent.stance,
            baseStyleId: opponent.base,
            levelId: opponent.level,
          }
        : undefined,
      heightCm: range("hmin", "hmax"),
      reachCm: range("rmin", "rmax"),
      fightWeightKg: range("wmin", "wmax"),
      stances: list("guarda").length ? list("guarda") : undefined,
      baseStyleIds: list("base_f").length ? list("base_f") : undefined,
      levelIds: list("nivel").length ? list("nivel") : undefined,
      periods: list("periodo").length ? list("periodo") : undefined,
      travelsForCamp: params.get("viaja") === "1" || undefined,
      nearCityId: opponent.city,
      radiusKm: num(params.get("raio")) ?? 30,
      sort: (params.get("ordem") as SparringQuery["sort"]) ?? undefined,
      page: num(params.get("page")) ?? 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, profile]);

  const { data, isLoading, error, isFetching } = useSparringSearch(query);
  const upgrade = error instanceof ApiError && error.needsUpgrade;

  if (!session)
    return (
      <Container className="py-16">
        <EmptyState title="Entre para buscar sparring">
          A busca mostra fotos de corpo e medidas, que só aparecem para quem tem conta.{" "}
          <Link className="text-brand-hot" to="/entrar?next=/sparring">
            Entrar ou criar perfil
          </Link>
        </EmptyState>
      </Container>
    );
  if (loadingMe) return <PageLoader />;
  if (!profile)
    return (
      <Container className="py-16">
        <EmptyState title="Crie seu perfil">
          Você precisa de um perfil de lutador, coach ou organizador para buscar sparrings.{" "}
          <Link className="text-brand-hot" to="/conta/perfis/novo">
            Criar perfil
          </Link>
        </EmptyState>
      </Container>
    );

  const styleName = (id?: string) => catalog?.fightingStyles.find((s) => s.id === id)?.name;
  const summary = [
    opponent.h && `${opponent.h} cm`,
    opponent.r && `env. ${opponent.r} cm`,
    opponent.w && `${opponent.w} kg`,
    opponent.stance && STANCE_LABEL[opponent.stance]?.toLowerCase(),
    opponent.base && `base ${styleName(opponent.base)?.toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container className="flex flex-col gap-6 py-8">
      <nav className="text-sm text-ink-muted" aria-label="Trilha">
        <Link to="/">Início</Link> / Sparring
      </nav>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 border-gold-edge bg-gold-bg">
            <span className="text-xs font-bold uppercase text-gold">
              {hasOpponent ? "Buscando pelo adversário" : "Busca por filtros"}
            </span>
            <span className="text-sm text-gold-text">
              {hasOpponent ? summary : "Descreva o adversário para ordenar por semelhança."}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {hasOpponent ? "Editar adversário" : "Descrever adversário"}
            </Button>
          </Card>
          <Card className="flex flex-col gap-4">
            {(
              [
                ["Altura", "hmin", "hmax", "cm"],
                ["Envergadura", "rmin", "rmax", "cm"],
                ["Peso de luta", "wmin", "wmax", "kg"],
              ] as const
            ).map(([label, a, b, unit]) => (
              <div key={label} className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-soft">
                  {label} ({unit})
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`${label} mínima`}
                    inputMode="decimal"
                    placeholder="mín"
                    value={params.get(a) ?? ""}
                    onChange={(e) => setOne(a, e.target.value)}
                  />
                  <span className="text-ink-muted">–</span>
                  <Input
                    aria-label={`${label} máxima`}
                    inputMode="decimal"
                    placeholder="máx"
                    value={params.get(b) ?? ""}
                    onChange={(e) => setOne(b, e.target.value)}
                  />
                </div>
              </div>
            ))}
            <FilterGroup label="Guarda">
              {(["southpaw", "orthodox"] as const).map((s) => (
                <ToggleChip key={s} selected={list("guarda").includes(s)} onClick={() => toggle("guarda", s)}>
                  {STANCE_LABEL[s]}
                </ToggleChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Base / estilo">
              {catalog?.fightingStyles.map((s) => (
                <ToggleChip key={s.id} selected={list("base_f").includes(s.id)} onClick={() => toggle("base_f", s.id)}>
                  {s.name}
                </ToggleChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Nível">
              {catalog?.levels.map((l) => (
                <ToggleChip key={l.id} selected={list("nivel").includes(l.id)} onClick={() => toggle("nivel", l.id)}>
                  {l.name}
                </ToggleChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Disponibilidade">
              {(
                [
                  ["morning", "Manhã"],
                  ["afternoon", "Tarde"],
                  ["evening", "Noite"],
                ] as const
              ).map(([v, l]) => (
                <ToggleChip key={v} selected={list("periodo").includes(v)} onClick={() => toggle("periodo", v)}>
                  {l}
                </ToggleChip>
              ))}
            </FilterGroup>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={params.get("viaja") === "1"}
                onChange={(e) => setOne("viaja", e.target.checked ? "1" : undefined)}
              />
              Aceita viajar para camp
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-soft">Distância: até {params.get("raio") ?? 30} km</span>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={num(params.get("raio")) ?? 30}
                onChange={(e) => setOne("raio", e.target.value)}
                className="accent-brand"
                aria-label="Raio em km"
              />
            </div>
          </Card>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Display as="h1" className="text-3xl lg:text-4xl">
              {data
                ? `${data.total} sparrings ${hasOpponent ? "parecidos com o seu adversário" : "encontrados"}`
                : "Sparrings"}
            </Display>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              Ordenar por
              <Select
                className="w-48"
                value={params.get("ordem") ?? ""}
                onChange={(e) => setOne("ordem", e.target.value || undefined)}
              >
                <option value="">{hasOpponent ? "Mais parecidos" : "Padrão"}</option>
                <option value="distance">Mais perto</option>
                <option value="record">Mais vitórias</option>
              </Select>
            </label>
          </div>
          {upgrade && (
            <Notice>
              {(error as ApiError).message}{" "}
              <Link to="/planos?tipo=fighter" className="font-bold underline">
                Ver planos
              </Link>
            </Notice>
          )}
          {error && !upgrade && <ErrorBox error={error} />}
          {isLoading && <PageLoader />}
          <div className={`grid gap-3 xl:grid-cols-2 ${isFetching ? "opacity-70" : ""}`}>
            {data?.results.map((f) => (
              <FighterCard key={f.id} fighter={f} />
            ))}
          </div>
          {data && !data.results.length && (
            <EmptyState title="Ninguém encontrado">Aumente a distância ou as faixas de medida.</EmptyState>
          )}
          {data && data.total > data.pageSize && (
            <nav className="flex justify-center gap-2" aria-label="Páginas">
              {Array.from({ length: Math.ceil(data.total / data.pageSize) }, (_, i) => i + 1).map((n) => (
                <ToggleChip key={n} selected={n === data.page} onClick={() => setOne("page", String(n))}>
                  {n}
                </ToggleChip>
              ))}
            </nav>
          )}
          {profile.type === "fighter" && profile.status !== "approved" && (
            <Notice tone="muted">
              Seu perfil ainda não aparece na busca.{" "}
              <ButtonLink to="/conta" variant="ghost" size="sm">
                Ver o que falta
              </ButtonLink>
            </Notice>
          )}
        </section>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Perfil do adversário">
        <OpponentForm
          initial={opponent}
          submitLabel="Aplicar"
          onSubmit={(p) => {
            const next = new URLSearchParams(params);
            ["h", "r", "w", "stance", "base", "level", "city", "page"].forEach((k) => next.delete(k));
            opponentToSearch(p).forEach((v, k) => next.set(k, v));
            setParams(next);
            setEditing(false);
          }}
        />
      </Modal>
    </Container>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
