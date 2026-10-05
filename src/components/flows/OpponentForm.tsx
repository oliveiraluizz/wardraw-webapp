import { useState, type FormEvent } from "react";
import { useCatalog } from "@/infra/hooks/queries";
import { Button, Field, Input, Select, ToggleChip } from "../shared/ui";

export interface OpponentParams {
  h?: string;
  r?: string;
  w?: string;
  stance?: string;
  base?: string;
  level?: string;
  city?: string;
}

/** RF-15 form: describe the opponent; results come ordered by similarity. */
export function OpponentForm({
  initial,
  onSubmit,
  submitLabel = "Buscar sparrings parecidos",
  compact,
}: {
  initial?: OpponentParams;
  onSubmit: (p: OpponentParams) => void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const { data: catalog } = useCatalog();
  const [p, setP] = useState<OpponentParams>(initial ?? {});
  const set = (k: keyof OpponentParams, v?: string) =>
    setP((prev) => ({ ...prev, [k]: prev[k] === v ? undefined : v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(p);
  };
  const baseStyles = (catalog?.fightingStyles ?? []).slice(0, compact ? 4 : 5);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Altura">
          <div className="relative">
            <Input
              inputMode="numeric"
              value={p.h ?? ""}
              onChange={(e) => setP({ ...p, h: e.target.value })}
              placeholder="190"
              aria-label="Altura em cm"
            />
            <span className="pointer-events-none absolute right-3 top-3 text-sm text-ink-muted">cm</span>
          </div>
        </Field>
        <Field label="Envergadura">
          <div className="relative">
            <Input
              inputMode="numeric"
              value={p.r ?? ""}
              onChange={(e) => setP({ ...p, r: e.target.value })}
              placeholder="196"
              aria-label="Envergadura em cm"
            />
            <span className="pointer-events-none absolute right-3 top-3 text-sm text-ink-muted">cm</span>
          </div>
        </Field>
        <Field label="Peso de luta">
          <div className="relative">
            <Input
              inputMode="decimal"
              value={p.w ?? ""}
              onChange={(e) => setP({ ...p, w: e.target.value })}
              placeholder="84"
              aria-label="Peso de luta em kg"
            />
            <span className="pointer-events-none absolute right-3 top-3 text-sm text-ink-muted">kg</span>
          </div>
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">Guarda e base</span>
        <div className="flex flex-wrap gap-2">
          <ToggleChip selected={p.stance === "southpaw"} onClick={() => set("stance", "southpaw")}>
            Canhoto
          </ToggleChip>
          <ToggleChip selected={p.stance === "orthodox"} onClick={() => set("stance", "orthodox")}>
            Destro
          </ToggleChip>
          {baseStyles.map((s) => (
            <ToggleChip key={s.id} selected={p.base === s.id} onClick={() => set("base", s.id)}>
              {s.name}
            </ToggleChip>
          ))}
        </div>
      </div>
      {!compact && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">Nível</span>
          <div className="flex flex-wrap gap-2">
            {(catalog?.levels ?? []).map((l) => (
              <ToggleChip key={l.id} selected={p.level === l.id} onClick={() => set("level", l.id)}>
                {l.name}
              </ToggleChip>
            ))}
          </div>
        </div>
      )}
      <Field label="Onde você treina">
        <Select value={p.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value || undefined })}>
          <option value="">Escolha a cidade ou o bairro</option>
          {(catalog?.cities ?? []).map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>{c.name} (toda a cidade)</option>
              {c.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}

export const opponentToSearch = (p: OpponentParams): URLSearchParams => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v && s.set(k, v));
  return s;
};
