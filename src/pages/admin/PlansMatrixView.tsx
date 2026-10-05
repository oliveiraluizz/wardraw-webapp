import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Card,
  Display,
  ErrorBox,
  Field,
  Input,
  Modal,
  Notice,
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { money } from "@/utils/format";
import { ResourcesView } from "./ResourcesView";

const TYPES = [
  ["fighter", "Lutador"],
  ["coach", "Coach"],
  ["provider", "Prestador"],
  ["organizer", "Organizador"],
] as const;

/** Everything a plan unlocks lives here: change a value and it applies to every subscriber right away. */
export function PlansMatrixView() {
  const { data, isLoading, error } = useQuery({ queryKey: keys.admin.matrix, queryFn: adminService.matrix });
  const [type, setType] = useState<string>("fighter");
  const [repricing, setRepricing] = useState<{ id: string; name: string } | null>(null);
  const set = useAdminMutation(
    ({ planId, key, value, inherits }: { planId: string; key: string; value: unknown; inherits?: boolean }) =>
      adminService.setPlanFeature(planId, key, value, inherits),
  );
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error} />;

  const plans = data.plans.filter((p) => p.profileType === type);
  const value = (planId: string, featureId: string) =>
    data.values.find((v) => v.planId === planId && v.featureId === featureId);

  return (
    <div className="flex flex-col gap-6">
      <Display className="text-3xl">Planos e recursos</Display>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => (
          <ToggleChip key={k} selected={type === k} onClick={() => setType(k)}>
            {l}
          </ToggleChip>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="flex flex-col gap-2">
            <span className="font-display text-2xl uppercase">{p.name}</span>
            {p.prices.map((pr) => (
              <span key={pr.id} className="text-sm text-ink-soft">
                {pr.billingInterval === "month" ? "Mensal" : "Anual"}:{" "}
                <b className="font-cond text-lg text-ink">{money(pr.amountCents)}</b>
              </span>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setRepricing({ id: p.id, name: p.name })}>
              Alterar preço
            </Button>
          </Card>
        ))}
      </div>
      {set.error && <ErrorBox error={set.error} />}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-2 text-ink-muted">
            <tr>
              <th className="px-4 py-3">Recurso</th>
              {plans.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.features.map((f) => (
              <tr key={f.id} className="border-t border-line">
                <td className="px-4 py-2.5">
                  <span className="block font-semibold">{f.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{f.key}</span>
                </td>
                {plans.map((p) => {
                  const v = value(p.id, f.id);
                  return (
                    <td key={p.id} className="px-4 py-2.5 text-center">
                      <Cell
                        type={f.valueType}
                        value={v?.value}
                        inherits={v?.inheritsToTeamMembers ?? false}
                        showInherit={type === "coach"}
                        onChange={(val, inherits) => set.mutate({ planId: p.id, key: f.key, value: val, inherits })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Notice tone="muted">
        “Vale para o time”: no plano de coach, libera o recurso para todos os lutadores do time dele.
      </Notice>
      <ResourcesView only={["trial-policies", "plans", "plan-highlights", "features", "plan-prices"]} />
      {repricing && <Reprice plan={repricing} onClose={() => setRepricing(null)} />}
    </div>
  );
}

function Cell({
  type,
  value,
  inherits,
  showInherit,
  onChange,
}: {
  type: string;
  value: unknown;
  inherits: boolean;
  showInherit: boolean;
  onChange: (v: unknown, inherits?: boolean) => void;
}) {
  if (type === "boolean")
    return (
      <div className="flex flex-col items-center gap-1">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked, inherits)}
          aria-label="Incluído"
        />
        {showInherit && value === true && (
          <label className="flex items-center gap-1 text-[11px] text-ink-muted">
            <input
              type="checkbox"
              className="h-3 w-3 accent-brand"
              checked={inherits}
              onChange={(e) => onChange(true, e.target.checked)}
            />{" "}
            vale para o time
          </label>
        )}
      </div>
    );
  if (type === "limit") {
    const unlimited = value === null;
    return (
      <div className="flex flex-col items-center gap-1">
        <Input
          className="h-9 w-20 text-center"
          type="number"
          min={0}
          disabled={unlimited}
          defaultValue={unlimited || value === undefined ? "" : String(value)}
          onBlur={(e) => e.target.value !== "" && onChange(Number(e.target.value), inherits)}
          aria-label="Limite"
        />
        <label className="flex items-center gap-1 text-[11px] text-ink-muted">
          <input
            type="checkbox"
            className="h-3 w-3 accent-brand"
            checked={unlimited}
            onChange={(e) => onChange(e.target.checked ? null : 0, inherits)}
          />{" "}
          ilimitado
        </label>
      </div>
    );
  }
  return <span className="text-xs text-ink-muted">{JSON.stringify(value ?? "—")}</span>;
}

/** Versioned price change: current subscribers keep their price. */
function Reprice({ plan, onClose }: { plan: { id: string; name: string }; onClose: () => void }) {
  const save = useAdminMutation((b: { billingInterval: "month" | "year"; amountCents: number; alsoAnnual: boolean }) =>
    adminService.reprice(plan.id, b),
  );
  return (
    <Modal open onClose={onClose} title={`Preço · ${plan.name}`}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate(
            {
              billingInterval: f.get("interval") as "month" | "year",
              amountCents: Math.round(Number(f.get("amount")) * 100),
              alsoAnnual: f.get("annual") === "on",
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Cobrança">
          <Select name="interval">
            <option value="month">Mensal</option>
            <option value="year">Anual</option>
          </Select>
        </Field>
        <Field label="Novo valor (R$)">
          <Input name="amount" inputMode="decimal" required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="annual" defaultChecked className="h-4 w-4 accent-brand" /> Gerar também o preço
          anual (12 pelo preço de 10, configurável)
        </label>
        <Notice tone="muted">Quem já assina continua pagando o preço antigo.</Notice>
        {save.error && <ErrorBox error={save.error} />}
        <Button type="submit" loading={save.isPending}>
          Salvar novo preço
        </Button>
      </form>
    </Modal>
  );
}
