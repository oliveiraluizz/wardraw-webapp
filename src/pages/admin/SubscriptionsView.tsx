import { useQuery } from "@tanstack/react-query";
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
  PageLoader,
  Select,
  ToggleChip,
} from "@/components/shared/ui";
import { useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";
import { money } from "@/utils/format";

type Row = Record<string, unknown> & { id?: string };
const STATUS = ["", "trialing", "pending_payment", "active", "past_due", "canceled", "expired"];
const LABEL: Record<string, string> = {
  "": "Todas",
  trialing: "Em teste",
  pending_payment: "Aguardando pagamento",
  active: "Ativas",
  past_due: "Em atraso",
  canceled: "Canceladas",
  expired: "Vencidas",
};

/** Pilot billing is manual (provider "manual"): confirm Pix/card payments here. */
export function SubscriptionsView() {
  const [status, setStatus] = useState("past_due");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "subscriptions", status],
    queryFn: () => adminService.subscriptions({ status: status || undefined }),
  });
  const [paying, setPaying] = useState<Row | null>(null);
  const extend = useAdminMutation(({ id, days }: { id: string; days: number }) =>
    adminService.patchSubscription(id, { extendDays: days }),
  );
  return (
    <div className="flex flex-col gap-5">
      <Display className="text-3xl">Assinaturas</Display>
      <div className="flex flex-wrap gap-2">
        {STATUS.map((s) => (
          <ToggleChip key={s} selected={status === s} onClick={() => setStatus(s)}>
            {LABEL[s]}
          </ToggleChip>
        ))}
      </div>
      {error && <ErrorBox error={error} />}
      {extend.error && <ErrorBox error={extend.error} />}
      {isLoading && <PageLoader />}
      {data?.data.map((s) => {
        const user = s.user as Row | undefined;
        const plan = s.plan as Row | undefined;
        const profile = s.profile as Row | undefined;
        const snapshot = s.priceSnapshot as { quote?: { recurringCents: number } } | undefined;
        return (
          <Card key={String(s.id)} className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1 flex-col">
              <span className="font-bold">{String(profile?.displayName ?? "—")}</span>
              <span className="text-xs text-ink-muted">{String(user?.email ?? "")}</span>
            </div>
            <Chip tone="gold">{String(plan?.name ?? "")}</Chip>
            <Chip>{LABEL[String(s.status)] ?? String(s.status)}</Chip>
            <span className="text-sm text-ink-muted">
              {money(snapshot?.quote?.recurringCents)} · vence{" "}
              {s.currentPeriodEnd ? new Date(String(s.currentPeriodEnd)).toLocaleDateString("pt-BR") : "—"}
            </span>
            <Button size="sm" onClick={() => setPaying(s)}>
              Confirmar pagamento
            </Button>
            <Button size="sm" variant="secondary" onClick={() => extend.mutate({ id: String(s.id), days: 7 })}>
              +7 dias
            </Button>
          </Card>
        );
      })}
      {paying && <MarkPaid sub={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

function MarkPaid({ sub, onClose }: { sub: Row; onClose: () => void }) {
  const pay = useAdminMutation((b: Row) => adminService.markPaid(String(sub.id), b));
  return (
    <Modal open onClose={onClose} title="Confirmar pagamento">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          pay.mutate(
            {
              method: f.get("method"),
              amountCents: f.get("amount") ? Math.round(Number(f.get("amount")) * 100) : undefined,
              notes: f.get("notes") || undefined,
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Forma">
          <Select name="method">
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
            <option value="manual">Outro</option>
          </Select>
        </Field>
        <Field label="Valor (R$)" hint="Vazio = valor do cronograma da assinatura">
          <Input name="amount" inputMode="decimal" />
        </Field>
        <Field label="Observação">
          <Input name="notes" />
        </Field>
        {pay.error && <ErrorBox error={pay.error} />}
        <Button type="submit" loading={pay.isPending}>
          Confirmar
        </Button>
      </form>
    </Modal>
  );
}
