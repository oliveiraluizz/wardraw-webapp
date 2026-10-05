import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMeMutation } from "@/infra/hooks/queries";
import { billingService } from "@/infra/services/me.service";
import type { PublicPlan, Quote } from "@/types/domain";
import { money } from "@/utils/format";
import { Button, ErrorBox, Field, Input, Modal, Notice } from "../shared/ui";

const describeSchedule = (q: Quote): string[] =>
  q.schedule.map((s) => {
    const when =
      s.toCycle === null
        ? s.fromCycle === 1
          ? "Todo mês"
          : `A partir da ${s.fromCycle}ª cobrança`
        : s.fromCycle === s.toCycle
          ? `${s.fromCycle}ª cobrança`
          : `Da ${s.fromCycle}ª à ${s.toCycle}ª cobrança`;
    return `${when}: ${money(s.amountCents)}`;
  });

/** Quote with coupon, then start the trial (RF-33) — the API applies admin overrides and promotions automatically. */
export function SubscribeModal({
  plan,
  priceId,
  profileId,
  onClose,
}: {
  plan: PublicPlan;
  priceId: string;
  profileId: string;
  onClose: () => void;
}) {
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | undefined>();
  const navigate = useNavigate();
  const quote = useMutation({
    mutationFn: (couponCode?: string) => billingService.quote({ planPriceId: priceId, profileId, couponCode }),
  });
  const subscribe = useMeMutation(() =>
    billingService.subscribe({ profileId, planPriceId: priceId, couponCode: applied }),
  );

  useEffect(() => {
    quote.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceId]);

  const q = quote.data?.quote;
  return (
    <Modal open onClose={onClose} title={`Plano ${plan.name}`}>
      <div className="flex flex-col gap-4">
        {q && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            {q.courtesy ? (
              <Notice tone="ok">Plano cortesia liberado para você.</Notice>
            ) : (
              <>
                {q.trialDays > 0 && <span className="font-bold text-ok">{q.trialDays} dias de teste grátis</span>}
                {describeSchedule(q).map((l) => (
                  <span key={l} className="text-sm text-ink-soft">
                    {l}
                  </span>
                ))}
              </>
            )}
            {q.lines.map((l) => (
              <span key={l.id} className="text-xs text-gold">
                ✓ {l.label}
              </span>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            quote.mutate(coupon || undefined, { onSuccess: () => setApplied(coupon || undefined) });
          }}
        >
          <Field label="Cupom" className="flex-1">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Ex.: PILOTORIO"
            />
          </Field>
          <Button type="submit" variant="secondary" loading={quote.isPending}>
            Aplicar
          </Button>
        </form>
        {quote.error && <ErrorBox error={quote.error} />}
        {subscribe.error && <ErrorBox error={subscribe.error} />}
        <Button
          size="lg"
          loading={subscribe.isPending}
          disabled={!q}
          onClick={() => subscribe.mutate(undefined, { onSuccess: () => (onClose(), navigate("/conta")) })}
        >
          {q?.trialDays ? "Começar período de teste" : "Assinar"}
        </Button>
        <p className="text-xs text-ink-muted">
          Depois do teste, só a mensalidade. Nada de comissão sobre serviços ou inscrições.
        </p>
      </div>
    </Modal>
  );
}
