import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { PlanCard } from "@/components/flows/cards";
import { SubscribeModal } from "@/components/flows/SubscribeModal";
import { Card, Display, ErrorBox, Eyebrow, PageLoader, ToggleChip } from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useMe, usePlans } from "@/infra/hooks/queries";
import type { ProfileType, PublicPlan } from "@/types/domain";
import { money } from "@/utils/format";

const TYPES: { code: ProfileType; label: string }[] = [
  { code: "organizer", label: "Organizador de evento" },
  { code: "fighter", label: "Lutador" },
  { code: "coach", label: "Coach" },
  { code: "provider", label: "Prestador de serviço" },
];

const FAQ = [
  [
    "A Wardraw fica com parte do que eu cobro?",
    "Não. Serviços e inscrições são combinados direto entre vocês. A plataforma só faz a comunicação.",
  ],
  ["Tem plano gratuito?", "Não, mas todo plano começa com um período de teste."],
  ["Posso ter mais de um perfil?", "Sim. Uma conta pode ser lutador e coach, por exemplo, cada perfil com seu plano."],
  ["O que acontece se eu parar de pagar?", "Seu perfil sai da busca, mas nada é apagado."],
];

export default function PlansPage() {
  const [params, setParams] = useSearchParams();
  const type = (params.get("tipo") as ProfileType) || "organizer";
  const [interval, setInterval] = useState<"month" | "year">("month");
  const { data: plans, isLoading, error } = usePlans();
  const { session } = useAuth();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<{ plan: PublicPlan; priceId: string } | null>(null);

  const byType = useMemo(() => (plans ?? []).filter((p) => p.profileType === type), [plans, type]);
  const others = TYPES.filter((t) => t.code !== type);
  const profile = me?.profiles.find((p) => p.type === type);

  const pick = (plan: PublicPlan, priceId: string) => {
    if (!session) return navigate(`/entrar?criar=1&tipo=${type}&next=/planos?tipo=${type}`);
    if (!profile) return navigate(`/conta/perfis/novo?tipo=${type}`);
    setPicked({ plan, priceId });
  };

  return (
    <Container className="flex flex-col gap-10 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Eyebrow>Período de teste em todos os planos</Eyebrow>
        <Display className="text-4xl lg:text-6xl">Um plano para cada papel na luta</Display>
        <p className="max-w-2xl text-lg text-ink-soft">
          Você paga só a mensalidade. Serviços e inscrições são combinados direto entre as pessoas, sem comissão.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="tablist">
        {TYPES.map((t) => (
          <ToggleChip key={t.code} role="tab" selected={type === t.code} onClick={() => setParams({ tipo: t.code })}>
            {t.label}
          </ToggleChip>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <ToggleChip selected={interval === "month"} onClick={() => setInterval("month")}>
          Mensal
        </ToggleChip>
        <ToggleChip selected={interval === "year"} onClick={() => setInterval("year")}>
          Anual (12 pelo preço de 10)
        </ToggleChip>
      </div>
      {isLoading && <PageLoader />}
      {error && <ErrorBox error={error} />}
      <div className="grid gap-4 md:grid-cols-3">
        {byType.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            interval={interval}
            onPick={(priceId) => pick(p, priceId)}
            current={profile?.plan?.id === p.id}
          />
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <Display as="h2" className="text-3xl">
          Outros perfis
        </Display>
        <div className="grid gap-3 md:grid-cols-3">
          {others.map((t) => {
            const list = (plans ?? []).filter((p) => p.profileType === t.code);
            return (
              <Card
                key={t.code}
                className="flex cursor-pointer flex-col gap-2 hover:bg-surface-2"
                onClick={() => setParams({ tipo: t.code })}
              >
                <span className="text-lg font-bold">{t.label}</span>
                {list.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-ink-soft">{p.name}</span>
                    <span className="font-cond font-bold">
                      {money(p.prices.find((x) => x.billingInterval === "month")?.amountCents)}
                    </span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Display as="h2" className="text-3xl">
          Perguntas frequentes
        </Display>
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-xl border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer font-bold">{q}</summary>
            <p className="mt-2 text-ink-soft">{a}</p>
          </details>
        ))}
      </section>
      {picked && profile && (
        <SubscribeModal
          plan={picked.plan}
          priceId={picked.priceId}
          profileId={profile.id}
          onClose={() => setPicked(null)}
        />
      )}
    </Container>
  );
}
