import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Chip, Display, ErrorBox, Field, Input, Modal, PageLoader, Select } from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { patch } from "@/infra/api/client";
import { SUBSCRIPTION_STATUS_LABEL } from "@/utils/format";

type Row = Record<string, unknown> & { id?: string };

/** Per-person billing: custom price, % discount, extra trial, courtesy plan, one-off feature grants, tags, suspension. */
export function UsersView() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const users = useQuery({ queryKey: ["adminUsers", q], queryFn: () => adminService.users(q || undefined) });
  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-3">
        <Display className="text-3xl">Usuários</Display>
        <Input placeholder="E-mail, nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
        {users.data?.data.map((u) => (
          <button
            key={String(u.id)}
            type="button"
            onClick={() => setSelected(String(u.id))}
            className={`rounded-xl border p-3 text-left ${selected === u.id ? "border-brand-hot bg-brand-deep" : "border-line bg-surface hover:bg-surface-2"}`}
          >
            <span className="block font-bold">{String(u.fullName ?? "Sem nome")}</span>
            <span className="text-xs text-ink-muted">{String(u.email ?? u.phone ?? "")}</span>
            {u.status !== "active" && (
              <Chip tone="hot" className="ml-2">
                {String(u.status)}
              </Chip>
            )}
          </button>
        ))}
      </div>
      {selected ? (
        <UserBilling id={selected} />
      ) : (
        <Card className="text-ink-muted">Escolha um usuário para ver perfis, assinaturas e dar descontos.</Card>
      )}
    </div>
  );
}

function UserBilling({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...keys.admin.all, "userBilling", id],
    queryFn: () => adminService.userBilling(id),
  });
  const update = useAdminMutation((b: Row) => patch(`/admin/users/${id}`, b));
  const [creating, setCreating] = useState<"override" | "grant" | null>(null);
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error} />;
  const user = data.user as Row;
  const profiles = data.profiles as Row[];
  const subs = data.subscriptions as Row[];
  const overrides = data.overrides as Row[];
  const grants = data.grants as Row[];
  const tags = (user.tags as string[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold">{String(user.fullName ?? "Sem nome")}</span>
          <span className="text-sm text-ink-muted">{String(user.email ?? "")}</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            loading={update.isPending}
            onClick={() => update.mutate({ status: user.status === "suspended" ? "active" : "suspended" })}
          >
            {user.status === "suspended" ? "Reativar conta" : "Suspender conta"}
          </Button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const tag = String(new FormData(e.currentTarget).get("tag") ?? "").trim();
            if (tag) update.mutate({ tags: [...new Set([...tags, tag])] });
          }}
        >
          <Input name="tag" placeholder="Nova tag (usada em públicos de cupom)" />
          <Button type="submit" variant="secondary">
            Adicionar
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => update.mutate({ tags: tags.filter((x) => x !== t) })}>
              <Chip tone="gold">{t} ✕</Chip>
            </button>
          ))}
        </div>
        {update.error && <ErrorBox error={update.error} />}
      </Card>
      <Card className="flex flex-col gap-2">
        <span className="font-bold">Perfis e assinaturas</span>
        {profiles.map((p) => {
          const s = subs.find(
            (x) =>
              x.profileId === p.id && ["trialing", "active", "past_due", "pending_payment"].includes(String(x.status)),
          );
          return (
            <div key={String(p.id)} className="flex items-center justify-between text-sm">
              <span>
                {String(p.displayName)}{" "}
                <span className="text-ink-muted">
                  · {String(p.type)} · {String(p.status)}
                </span>
              </span>
              <span>
                {s
                  ? `${String((s.plan as Row)?.name)} · ${SUBSCRIPTION_STATUS_LABEL[String(s.status)] ?? String(s.status)}`
                  : "Sem assinatura"}
              </span>
            </div>
          );
        })}
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold">Descontos e concessões</span>
          <Button size="sm" onClick={() => setCreating("override")}>
            Novo desconto
          </Button>
        </div>
        {overrides.map((o) => (
          <div key={String(o.id)} className="flex items-center justify-between text-sm">
            <span>
              {
                {
                  custom_price: "Preço customizado",
                  percent_discount: "% de desconto",
                  extra_trial_days: "Dias extras de teste",
                  comp_plan: "Plano cortesia",
                }[String(o.kind)]
              }{" "}
              <span className="text-ink-muted">· {String(o.reason)}</span>
            </span>
            <Chip tone={o.active && !o.deletedAt ? "ok" : "muted"}>
              {o.active && !o.deletedAt ? "Ativo" : "Inativo"}
            </Chip>
          </div>
        ))}
        {!overrides.length && <span className="text-sm text-ink-muted">Nenhum.</span>}
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold">Recursos liberados avulsos</span>
          <Button size="sm" onClick={() => setCreating("grant")}>
            Liberar recurso
          </Button>
        </div>
        {grants.map((g) => (
          <span key={String(g.id)} className="text-sm">
            {String(g.featureId)} = {JSON.stringify(g.value)}{" "}
            <span className="text-ink-muted">· {String(g.reason)}</span>
          </span>
        ))}
        {!grants.length && <span className="text-sm text-ink-muted">Nenhum.</span>}
      </Card>
      {creating === "override" && <OverrideForm userId={id} profiles={profiles} onClose={() => setCreating(null)} />}
      {creating === "grant" && <GrantForm userId={id} profiles={profiles} onClose={() => setCreating(null)} />}
    </div>
  );
}

function OverrideForm({ userId, profiles, onClose }: { userId: string; profiles: Row[]; onClose: () => void }) {
  const matrix = useQuery({ queryKey: keys.admin.matrix, queryFn: adminService.matrix });
  const [kind, setKind] = useState("percent_discount");
  const save = useAdminMutation((b: Row) => adminService.create("billing-overrides", b));
  return (
    <Modal open onClose={onClose} title="Novo desconto individual">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const b: Row = {
            userId,
            kind,
            reason: f.get("reason"),
            profileId: f.get("profileId") || null,
            planId: f.get("planId") || null,
          };
          if (kind === "custom_price") b.amountCents = Math.round(Number(f.get("value")) * 100);
          if (kind === "percent_discount") b.percent = Number(f.get("value"));
          if (kind === "extra_trial_days") b.days = Number(f.get("value"));
          if (f.get("validUntil")) b.validUntil = new Date(String(f.get("validUntil"))).toISOString();
          save.mutate(b, { onSuccess: onClose });
        }}
      >
        <Field label="Tipo">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="percent_discount">% de desconto</option>
            <option value="custom_price">Preço customizado</option>
            <option value="extra_trial_days">Dias extras de teste</option>
            <option value="comp_plan">Plano cortesia (grátis)</option>
          </Select>
        </Field>
        {kind !== "comp_plan" && (
          <Field label={kind === "custom_price" ? "Preço (R$)" : kind === "percent_discount" ? "Percentual" : "Dias"}>
            <Input name="value" inputMode="decimal" required />
          </Field>
        )}
        <Field label="Perfil" hint="Vazio = vale para todos os perfis da pessoa">
          <Select name="profileId">
            <option value="">Todos</option>
            {profiles.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {String(p.displayName)} ({String(p.type)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plano" hint={kind === "comp_plan" ? "Obrigatório para cortesia" : "Vazio = qualquer plano"}>
          <Select name="planId" required={kind === "comp_plan"}>
            <option value="">Qualquer</option>
            {matrix.data?.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.profileType} · {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Válido até (opcional)">
          <Input name="validUntil" type="date" />
        </Field>
        <Field label="Motivo">
          <Input name="reason" required placeholder="Ex.: atleta embaixador do piloto" />
        </Field>
        {save.error && <ErrorBox error={save.error} />}
        <Button type="submit" loading={save.isPending}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}

function GrantForm({ userId, profiles, onClose }: { userId: string; profiles: Row[]; onClose: () => void }) {
  const matrix = useQuery({ queryKey: keys.admin.matrix, queryFn: adminService.matrix });
  const save = useAdminMutation((b: Row) => adminService.create("entitlement-grants", b));
  const [featureId, setFeatureId] = useState("");
  const feature = matrix.data?.features.find((f) => f.id === featureId);
  return (
    <Modal open onClose={onClose} title="Liberar recurso">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const raw = String(f.get("value") ?? "");
          const value = feature?.valueType === "boolean" ? true : raw === "" ? null : Number(raw);
          save.mutate(
            {
              userId,
              profileId: f.get("profileId") || null,
              featureId,
              value,
              reason: f.get("reason"),
              validUntil: f.get("validUntil") ? new Date(String(f.get("validUntil"))).toISOString() : null,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Recurso">
          <Select value={featureId} onChange={(e) => setFeatureId(e.target.value)} required>
            <option value="">Escolha</option>
            {matrix.data?.features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
        {feature?.valueType === "limit" && (
          <Field label="Limite" hint="Vazio = ilimitado">
            <Input name="value" inputMode="numeric" />
          </Field>
        )}
        <Field label="Perfil">
          <Select name="profileId">
            <option value="">Todos</option>
            {profiles.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {String(p.displayName)} ({String(p.type)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Válido até (opcional)">
          <Input name="validUntil" type="date" />
        </Field>
        <Field label="Motivo">
          <Input name="reason" required />
        </Field>
        {save.error && <ErrorBox error={save.error} />}
        <Button type="submit" loading={save.isPending} disabled={!featureId}>
          Liberar
        </Button>
      </form>
    </Modal>
  );
}
