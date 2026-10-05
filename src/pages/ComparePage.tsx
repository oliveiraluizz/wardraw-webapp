import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import {
  ButtonLink,
  Card,
  Display,
  EmptyState,
  ErrorBox,
  Notice,
  PageLoader,
  Select,
  SimilarityBadge,
} from "@/components/shared/ui";
import { useActiveProfile } from "@/infra/hooks/useActiveProfile";
import { searchService } from "@/infra/services/search.service";
import { cn } from "@/utils/cn";
import { measure, METHOD_LABEL, RESULT_LETTER, STANCE_LABEL } from "@/utils/format";

const GROUP_LABEL: Record<string, string> = {
  medidas: "Medidas",
  estilo: "Estilo",
  cartel: "Cartel",
  atividade: "Atividade",
};

const show = (key: string, v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return (v as { kg?: number }).kg != null ? `${measure((v as { kg: number }).kg)} kg` : "—";
  if (key === "stance") return STANCE_LABEL[String(v)] ?? String(v);
  if (["height", "reach"].includes(key)) return `${measure(v as number)} cm`;
  if (key === "fightWeight") return `${measure(v as number)} kg`;
  if (key === "winRate") return `${v}%`;
  if (key === "lastFight") return new Date(String(v)).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return String(v);
};

/** RF-41..RF-46: side-by-side comparison; locked preview when the plan does not include it. */
export default function ComparePage() {
  const [params] = useSearchParams();
  const sideB = params.get("b") ?? "";
  const { profile } = useActiveProfile(["fighter", "coach", "organizer"]);
  const options = useQuery({
    queryKey: ["compareOptions", profile?.id],
    queryFn: () => searchService.compareOptions(profile!.id),
    enabled: !!profile,
  });
  const [sideA, setSideA] = useState<string>("");
  const effectiveA = sideA || (profile?.type === "fighter" ? profile.id : (options.data?.fighters[0]?.id ?? ""));
  const result = useQuery({
    queryKey: ["compare", profile?.id, effectiveA, sideB],
    queryFn: () => searchService.compare(profile!.id, effectiveA, sideB),
    enabled: !!profile && !!effectiveA && !!sideB,
    retry: false,
  });

  if (!profile)
    return (
      <Container className="py-12">
        <EmptyState title="Crie um perfil para comparar" />
      </Container>
    );
  if (!sideB)
    return (
      <Container className="py-12">
        <EmptyState title="Escolha um lutador">
          Abra o perfil de um lutador e toque em “Comparar comigo”.{" "}
          <Link to="/sparring" className="text-brand-hot">
            Buscar lutadores
          </Link>
        </EmptyState>
      </Container>
    );

  const r = result.data;
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Display className="text-4xl">Comparação</Display>
      {profile.type !== "fighter" && !!options.data?.fighters.length && (
        <label className="flex max-w-sm flex-col gap-1 text-sm text-ink-soft">
          Lado A
          <Select value={effectiveA} onChange={(e) => setSideA(e.target.value)}>
            {options.data.fighters.map((f) => (
              <option key={f.id} value={f.id}>
                {f.displayName}
              </option>
            ))}
          </Select>
        </label>
      )}
      {result.isLoading && <PageLoader />}
      {result.error && <ErrorBox error={result.error} />}
      {r?.locked && (
        <div className="relative overflow-hidden rounded-card border border-line">
          <div className="pointer-events-none grid select-none grid-cols-3 gap-3 p-6 blur-sm" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-surface-2" />
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/70 p-6 text-center">
            <p className="max-w-md text-lg">{r.message}</p>
            <ButtonLink to="/planos?tipo=fighter">Ver planos</ButtonLink>
          </div>
        </div>
      )}
      {r && !r.locked && r.summary && (
        <>
          <Card className="grid grid-cols-3 items-center gap-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="font-bold">{r.sideA?.displayName}</span>
              <span className="font-cond text-4xl font-bold text-brand-hot">{r.summary.a}</span>
              <span className="text-xs text-ink-muted">vantagens</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl">VS</span>
              <SimilarityBadge percent={r.summary.similarityPercent} label="semelhança" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold">{r.sideB?.displayName}</span>
              <span className="font-cond text-4xl font-bold text-brand-hot">{r.summary.b}</span>
              <span className="text-xs text-ink-muted">vantagens</span>
            </div>
          </Card>
          <p className="text-sm text-ink-muted">
            De {r.summary.totalIndicators} indicadores, {r.summary.neutral} estão empatados ou não têm vantagem clara.
          </p>
          {Object.keys(GROUP_LABEL).map((g) => (
            <Card key={g} className="flex flex-col gap-1 p-0">
              <h2 className="border-b border-line px-4 py-3 font-display text-xl uppercase">{GROUP_LABEL[g]}</h2>
              {r.indicators
                ?.filter((i) => i.group === g)
                .map((i) => (
                  <div key={i.key} className="grid grid-cols-3 items-center px-4 py-2 text-sm">
                    <span className={cn("font-cond text-lg font-bold", i.advantage === "a" && "text-ok")}>
                      {show(i.key, i.a)}
                    </span>
                    <span className="text-center text-ink-muted">{i.label}</span>
                    <span className={cn("text-right font-cond text-lg font-bold", i.advantage === "b" && "text-ok")}>
                      {show(i.key, i.b)}
                    </span>
                  </div>
                ))}
            </Card>
          ))}
          {!!r.commonOpponents?.length && (
            <Card className="flex flex-col gap-2">
              <h2 className="font-display text-xl uppercase">Adversários em comum</h2>
              {r.commonOpponents.map((c) => (
                <div key={c.opponent} className="text-sm">
                  <span className="font-bold">{c.opponent}</span>
                  <span className="text-ink-muted">
                    {" "}
                    — {r.sideA?.displayName}: {RESULT_LETTER[c.a.result]} {c.a.method ? METHOD_LABEL[c.a.method] : ""} ·{" "}
                    {r.sideB?.displayName}:{" "}
                    {c.b.map((x) => `${RESULT_LETTER[x.result]} ${x.method ? METHOD_LABEL[x.method] : ""}`).join(", ")}
                  </span>
                </div>
              ))}
            </Card>
          )}
          <Notice tone="muted">{r.disclaimer}</Notice>
        </>
      )}
    </Container>
  );
}
