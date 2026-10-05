import type { Catalog, EventPanel } from "@/types/domain";

type Modality = Catalog["modalities"][number];

export interface EventFlow {
  /** Jiu-Jitsu style events: categories, registrations and brackets. */
  hasBrackets: boolean;
  /** MMA / Muay Thai / Boxe style events: a card of booked bouts. */
  hasCard: boolean;
  bracketModalities: Modality[];
  cardModalities: Modality[];
  /** Workflow shown at the top of the event, each step linking to its section. */
  steps: { label: string; to: string }[];
  /** Sidebar sections that make sense for this event. */
  sections: string[];
}

/** "Jiu-Jitsu", "MMA e Boxe", "MMA, Muay Thai e Boxe". */
export const joinNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

/**
 * What the organizer has to do depends on the event format and on its modalities (bracket sports vs card sports),
 * so an MMA card never shows Jiu-Jitsu brackets and vice versa.
 */
export function eventFlow(e: EventPanel, catalog: Catalog | undefined): EventFlow {
  const modalities = (catalog?.modalities ?? []).filter((m) => e.modalityIds.includes(m.id));
  const bracketModalities = e.format === "card" ? [] : modalities.filter((m) => m.usesBrackets);
  const cardModalities = e.format === "bracket" ? [] : modalities.filter((m) => m.usesCard);
  let hasBrackets = bracketModalities.length > 0;
  let hasCard = cardModalities.length > 0;
  // Catalog not loaded yet (or modalities without flags): fall back to the event format.
  if (!hasBrackets && !hasCard) {
    hasBrackets = e.format !== "card";
    hasCard = e.format !== "bracket";
  }

  const steps: EventFlow["steps"] = [];
  if (hasBrackets) steps.push({ label: "Inscrições", to: "inscricoes" }, { label: "Chaves", to: "chaves" });
  if (hasCard) steps.push({ label: "Card", to: "card" });
  steps.push({ label: "Pesagem", to: hasBrackets ? "chaves" : "card" });
  steps.push({ label: "Resultados", to: hasCard ? "resultados" : "chaves" });

  const sections = ["visao"];
  if (hasBrackets || e.divisions.length) sections.push("inscricoes");
  if (hasBrackets) sections.push("chaves");
  if (hasCard) sections.push("card", "resultados");
  sections.push("equipe");

  return { hasBrackets, hasCard, bracketModalities, cardModalities, steps, sections };
}
