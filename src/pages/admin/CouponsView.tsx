import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Card,
  Chip,
  Display,
  ErrorBox,
  Field,
  Input,
  Modal,
  Notice,
  PageLoader,
  Select,
  Textarea,
} from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { money } from "@/utils/format";

type Row = Record<string, unknown>;

const TYPE_LABEL: Record<string, string> = {
  percent: "% de desconto",
  fixed_amount: "Valor fixo de desconto (R$)",
  price_override: "Preço final fixo (R$)",
  extra_trial_days: "Dias extras de teste",
  free_cycles: "Mensalidades grátis",
};

const describe = (c: Row): string => {
  const v = Number(c.discountValue);
  const value =
    c.discountType === "percent"
      ? `${v}%`
      : c.discountType === "extra_trial_days"
        ? `+${v} dias de teste`
        : c.discountType === "free_cycles"
          ? `${v} mês(es) grátis`
          : money(v);
  const dur =
    c.duration === "forever"
      ? "para sempre"
      : c.duration === "repeating"
        ? `por ${c.durationCycles} cobranças`
        : "na 1ª cobrança";
  return ["extra_trial_days", "free_cycles"].includes(String(c.discountType)) ? value : `${value} ${dur}`;
};

export function CouponsView() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: [...keys.admin.coupons, q],
    queryFn: () => adminService.coupons(q || undefined),
  });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [preview, setPreview] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Display className="text-3xl">Cupons e promoções</Display>
        <div className="flex-1" />
        <Input className="h-10 w-56" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={() => setPreview(true)}>
          Simular preço
        </Button>
        <Button onClick={() => setEditing("new")}>Novo cupom</Button>
      </div>
      <Notice tone="muted">
        Cupom com código é digitado pela pessoa; promoção automática (sem código) vale sozinha para quem se encaixa no
        alvo e no público.
      </Notice>
      {error && <ErrorBox error={error} />}
      {isLoading && <PageLoader />}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.map((c) => (
          <Card
            key={String(c.id)}
            className="flex cursor-pointer flex-col gap-2 hover:bg-surface-2"
            onClick={() => setEditing(String(c.id))}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold">{String(c.code ?? "AUTOMÁTICA")}</span>
              <span className="text-ink-soft">{String(c.name)}</span>
              <div className="flex-1" />
              <Chip tone={c.active ? "ok" : "muted"}>{c.active ? "Ativo" : "Inativo"}</Chip>
              {!!c.autoApply && <Chip tone="gold">Automática</Chip>}
            </div>
            <span className="text-sm">{describe(c)}</span>
            <span className="text-xs text-ink-muted">
              {String(c.redemptions)} uso(s){c.maxRedemptions ? ` de ${c.maxRedemptions}` : ""}
              {c.validUntil ? ` · até ${new Date(String(c.validUntil)).toLocaleDateString("pt-BR")}` : ""}
              {c.firstSubscriptionOnly ? " · só 1ª assinatura" : ""}
            </span>
          </Card>
        ))}
      </div>
      {editing && <CouponEditor id={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {preview && <QuotePreview onClose={() => setPreview(false)} />}
    </div>
  );
}

function CouponEditor({ id, onClose }: { id?: string; onClose: () => void }) {
  const existing = useQuery({ queryKey: ["coupon", id], queryFn: () => adminService.coupon(id!), enabled: !!id });
  if (id && !existing.data)
    return (
      <Modal open onClose={onClose} title="Cupom">
        {existing.error ? <ErrorBox error={existing.error} /> : <PageLoader />}
      </Modal>
    );
  return <CouponForm id={id} c={existing.data} onClose={onClose} />;
}

function CouponForm({
  id,
  c,
  onClose,
}: {
  id?: string;
  c?: Row & { targets: Row[]; audiences: Row[] };
  onClose: () => void;
}) {
  const matrix = useQuery({ queryKey: keys.admin.matrix, queryFn: adminService.matrix });
  const save = useAdminMutation((b: Row) => adminService.saveCoupon(b, id));
  const [currentType, setType] = useState<string>(String(c?.discountType ?? "percent"));
  const [currentDuration, setDuration] = useState<string>(String(c?.duration ?? "once"));
  const [t, setTargets] = useState<Row[]>(c?.targets ?? []);
  const [a, setAudiences] = useState<Row[]>(c?.audiences ?? []);
  const isMoney = ["fixed_amount", "price_override"].includes(currentType);

  return (
    <Modal open onClose={onClose} title={id ? "Editar cupom" : "Novo cupom"} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const value = Number(f.get("discountValue"));
          save.mutate(
            {
              code: String(f.get("code") || "") || null,
              name: f.get("name"),
              description: f.get("description") || undefined,
              discountType: f.get("discountType"),
              discountValue: isMoney ? Math.round(value * 100) : value,
              duration: f.get("duration"),
              durationCycles: f.get("durationCycles") ? Number(f.get("durationCycles")) : undefined,
              autoApply: f.get("autoApply") === "on",
              stackable: f.get("stackable") === "on",
              priority: Number(f.get("priority") || 0),
              validFrom: f.get("validFrom") ? new Date(String(f.get("validFrom"))).toISOString() : null,
              validUntil: f.get("validUntil") ? new Date(String(f.get("validUntil"))).toISOString() : null,
              maxRedemptions: f.get("maxRedemptions") ? Number(f.get("maxRedemptions")) : null,
              maxPerUser: f.get("maxPerUser") ? Number(f.get("maxPerUser")) : null,
              firstSubscriptionOnly: f.get("firstSubscriptionOnly") === "on",
              active: f.get("active") === "on",
              targets: t.map((x) =>
                Object.fromEntries(
                  Object.entries(x).filter(([k, v]) => ["profileType", "planId", "billingInterval"].includes(k) && v),
                ),
              ),
              audiences: a.map((x) => ({ kind: x.kind, value: x.value })),
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Código" hint="Vazio = promoção automática">
          <Input name="code" defaultValue={String(c?.code ?? "")} placeholder="PILOTORIO" />
        </Field>
        <Field label="Nome interno">
          <Input name="name" required defaultValue={String(c?.name ?? "")} />
        </Field>
        <Field label="Tipo de desconto">
          <Select name="discountType" value={currentType} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={isMoney ? "Valor (R$)" : "Valor"}>
          <Input
            name="discountValue"
            inputMode="decimal"
            required
            defaultValue={c ? String(isMoney ? Number(c.discountValue) / 100 : c.discountValue) : ""}
          />
        </Field>
        {!["extra_trial_days", "free_cycles"].includes(currentType) && (
          <>
            <Field label="Duração">
              <Select name="duration" value={currentDuration} onChange={(e) => setDuration(e.target.value)}>
                <option value="once">Só na 1ª cobrança</option>
                <option value="repeating">Por N cobranças</option>
                <option value="forever">Para sempre</option>
              </Select>
            </Field>
            {currentDuration === "repeating" && (
              <Field label="Quantas cobranças">
                <Input name="durationCycles" inputMode="numeric" defaultValue={String(c?.durationCycles ?? 3)} />
              </Field>
            )}
          </>
        )}
        <Field label="Válido a partir de">
          <Input name="validFrom" type="date" defaultValue={c?.validFrom ? String(c.validFrom).slice(0, 10) : ""} />
        </Field>
        <Field label="Válido até">
          <Input name="validUntil" type="date" defaultValue={c?.validUntil ? String(c.validUntil).slice(0, 10) : ""} />
        </Field>
        <Field label="Usos no total" hint="Vazio = sem limite">
          <Input name="maxRedemptions" inputMode="numeric" defaultValue={String(c?.maxRedemptions ?? "")} />
        </Field>
        <Field label="Usos por pessoa">
          <Input name="maxPerUser" inputMode="numeric" defaultValue={String(c?.maxPerUser ?? 1)} />
        </Field>
        <Field label="Prioridade" hint="Desempate entre promoções">
          <Input name="priority" inputMode="numeric" defaultValue={String(c?.priority ?? 0)} />
        </Field>
        <Field label="Descrição">
          <Textarea name="description" defaultValue={String(c?.description ?? "")} />
        </Field>
        <div className="flex flex-col gap-2 text-sm text-ink-soft sm:col-span-2">
          {(
            [
              ["active", "Ativo", c ? !!c.active : true],
              ["autoApply", "Promoção automática (vale sem digitar código)", !!c?.autoApply],
              ["stackable", "Acumula com outros descontos", !!c?.stackable],
              ["firstSubscriptionOnly", "Só para a primeira assinatura da pessoa", !!c?.firstSubscriptionOnly],
            ] as const
          ).map(([n, l, d]) => (
            <label key={n} className="flex items-center gap-2">
              <input type="checkbox" name={n} defaultChecked={d} className="h-4 w-4 accent-brand" /> {l}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-bold">Onde vale (vazio = todos os planos)</span>
          {t.map((x, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Select
                value={String(x.profileType ?? "")}
                onChange={(e) =>
                  setTargets(t.map((y, j) => (j === i ? { ...y, profileType: e.target.value || null } : y)))
                }
              >
                <option value="">Qualquer perfil</option>
                <option value="fighter">Lutador</option>
                <option value="coach">Coach</option>
                <option value="provider">Prestador</option>
                <option value="organizer">Organizador</option>
              </Select>
              <Select
                value={String(x.planId ?? "")}
                onChange={(e) => setTargets(t.map((y, j) => (j === i ? { ...y, planId: e.target.value || null } : y)))}
              >
                <option value="">Qualquer plano</option>
                {matrix.data?.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profileType} · {p.name}
                  </option>
                ))}
              </Select>
              <Select
                value={String(x.billingInterval ?? "")}
                onChange={(e) =>
                  setTargets(t.map((y, j) => (j === i ? { ...y, billingInterval: e.target.value || null } : y)))
                }
              >
                <option value="">Mensal ou anual</option>
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </Select>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTargets(t.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setTargets([...t, { profileType: null, planId: null, billingInterval: null }])}
          >
            Adicionar alvo
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-bold">Quem pode usar (vazio = qualquer pessoa)</span>
          {a.map((x, i) => (
            <div key={i} className="grid grid-cols-[200px_1fr_auto] gap-2">
              <Select
                value={String(x.kind)}
                onChange={(e) => setAudiences(a.map((y, j) => (j === i ? { ...y, kind: e.target.value } : y)))}
              >
                <option value="email">E-mail</option>
                <option value="email_domain">Domínio de e-mail</option>
                <option value="user_tag">Tag do usuário</option>
                <option value="city">Cidade (ID)</option>
                <option value="user">Usuário (ID)</option>
                <option value="signed_up_after">Cadastrado depois de (data)</option>
              </Select>
              <Input
                value={String(x.value ?? "")}
                onChange={(e) => setAudiences(a.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))}
                placeholder="ex.: piloto-rio, @equipe.com.br"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setAudiences(a.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setAudiences([...a, { kind: "user_tag", value: "" }])}
          >
            Adicionar público
          </Button>
        </div>
        {save.error && (
          <div className="sm:col-span-2">
            <ErrorBox error={save.error} />
          </div>
        )}
        <Button type="submit" loading={save.isPending} className="sm:col-span-2">
          Salvar cupom
        </Button>
      </form>
    </Modal>
  );
}

/** Shows exactly what a given person would pay: price + their overrides + coupon + automatic promotions + trial. */
function QuotePreview({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const users = useQuery({ queryKey: ["adminUsers", q], queryFn: () => adminService.users(q), enabled: q.length > 2 });
  const matrix = useQuery({ queryKey: keys.admin.matrix, queryFn: adminService.matrix });
  const run = useMutation({ mutationFn: (b: Row) => adminService.quotePreview(b) });
  const quote = run.data?.quote as
    | {
        trialDays: number;
        schedule: { fromCycle: number; toCycle: number | null; amountCents: number }[];
        lines: { label: string }[];
      }
    | undefined;
  return (
    <Modal open onClose={onClose} title="Simular preço">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run.mutate({
            userId: f.get("userId"),
            planPriceId: f.get("planPriceId"),
            couponCode: f.get("couponCode") || undefined,
          });
        }}
      >
        <Field label="Buscar usuário">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e-mail ou nome" />
        </Field>
        <Field label="Usuário">
          <Select name="userId" required>
            {users.data?.data.map((u) => (
              <option key={String(u.id)} value={String(u.id)}>
                {String(u.fullName ?? "")} · {String(u.email ?? "")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plano e preço">
          <Select name="planPriceId" required>
            {matrix.data?.plans.flatMap((p) =>
              p.prices.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {p.profileType} · {p.name} · {pr.billingInterval === "month" ? "mensal" : "anual"} ·{" "}
                  {money(pr.amountCents)}
                </option>
              )),
            )}
          </Select>
        </Field>
        <Field label="Cupom (opcional)">
          <Input name="couponCode" />
        </Field>
        {run.error && <ErrorBox error={run.error} />}
        <Button type="submit" loading={run.isPending}>
          Simular
        </Button>
        {quote && (
          <Card className="flex flex-col gap-1 text-sm">
            <span className="font-bold">{quote.trialDays} dias de teste</span>
            {quote.schedule.map((s) => (
              <span key={s.fromCycle}>
                {s.toCycle === null ? `A partir da ${s.fromCycle}ª` : `${s.fromCycle}ª a ${s.toCycle}ª`} cobrança:{" "}
                {money(s.amountCents)}
              </span>
            ))}
            {quote.lines.map((l, i) => (
              <span key={i} className="text-gold">
                ✓ {l.label}
              </span>
            ))}
          </Card>
        )}
      </form>
    </Modal>
  );
}
