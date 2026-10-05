import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const toDate = (d: string | Date): Date => (typeof d === "string" ? parseISO(d) : d);

export const money = (cents: number | null | undefined): string =>
  cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "Sáb, 31 out · 18h" */
export const eventDate = (d: string | Date, withHour = true): string => {
  const date = toDate(d);
  const day = format(date, "EEE, d MMM", { locale: ptBR }).replace(".", "");
  const capital = day.charAt(0).toUpperCase() + day.slice(1);
  return withHour ? `${capital} · ${format(date, "H'h'mm", { locale: ptBR }).replace("h00", "h")}` : capital;
};

export const dayBadge = (d: string | Date): { day: string; month: string } => {
  const date = toDate(d);
  return { day: format(date, "dd"), month: format(date, "MMM", { locale: ptBR }).replace(".", "") };
};

export const shortDate = (d: string | Date): string => format(toDate(d), "dd/MM", { locale: ptBR });
export const monthYear = (d: string | Date): string => format(toDate(d), "MMM yyyy", { locale: ptBR }).replace(".", "");
export const ago = (d: string | Date): string =>
  formatDistanceToNowStrict(toDate(d), { locale: ptBR, addSuffix: true });

/** Measures in pt-BR without trailing zeros: 180 → "180", 80.4 → "80,4", "77.00" → "77". */
export const measure = (v: number | string | null | undefined): string | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : String(v);
};

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: "Em teste",
  pending_payment: "Aguardando pagamento",
  active: "Ativa",
  past_due: "Em atraso",
  canceled: "Cancelada",
  expired: "Vencida",
};

export const STANCE_LABEL: Record<string, string> = {
  orthodox: "Destro",
  southpaw: "Canhoto",
  switch: "Troca a guarda",
};
export const LEVEL_LABEL: Record<string, string> = {
  amateur: "Amador",
  professional: "Profissional",
  mixed: "Amador e Pro",
};
export const PERIOD_LABEL: Record<string, string> = { morning: "Manhã", afternoon: "Tarde", evening: "Noite" };
export const DAY_LABEL: Record<string, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};
export const METHOD_LABEL: Record<string, string> = {
  ko_tko: "KO/TKO",
  submission: "Finalização",
  decision: "Decisão",
  dq: "Desclassificação",
  other: "Outro",
};
export const RESULT_LETTER: Record<string, string> = { win: "V", loss: "D", draw: "E", no_contest: "NC" };

export const record = (w = 0, l = 0, d = 0): string => `${w}-${l}-${d}`;

export const initials = (name: string): string =>
  name
    .replace(/["“”]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const availabilitySummary = (a?: { days?: string[]; periods?: string[] }): string => {
  if (!a?.days?.length && !a?.periods?.length) return "Disponibilidade não informada";
  const days = a.days?.length === 7 ? "Todos os dias" : (a.days ?? []).map((d) => DAY_LABEL[d] ?? d).join(", ");
  const periods = (a.periods ?? []).map((p) => (PERIOD_LABEL[p] ?? p).toLowerCase()).join(" e ");
  return [days, periods].filter(Boolean).join(" · ");
};
