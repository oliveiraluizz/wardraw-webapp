import { del, get, post, put, patch } from "../api/client";
import { endpoints } from "../api/endpoints";
import type {
  AgendaEvent,
  BracketView,
  CardBout,
  EventPage,
  EventPanel,
  RegistrationRow,
  WeighInRow,
} from "@/types/domain";

export const eventsService = {
  agenda: (q: Record<string, unknown>) => get<{ total: number; results: AgendaEvent[] }>(endpoints.events, q),
  featured: (cityId?: string) => get<AgendaEvent[]>(endpoints.eventsFeatured, { cityId }),
  page: (idOrSlug: string) => get<EventPage>(endpoints.event(idOrSlug)),
  myEvents: () =>
    get<
      {
        id: string;
        name: string;
        slug: string;
        starts_at: string;
        status: string;
        format: string;
        role: string;
        modalities: string;
      }[]
    >(endpoints.myEvents),
  myRegistrations: () => get<Record<string, unknown>[]>(endpoints.myRegistrations),
  // Organizer
  create: (body: Record<string, unknown>) => post<EventPanel>(endpoints.events, body),
  panel: (id: string) => get<EventPanel>(endpoints.eventSub(id, "panel")),
  update: (id: string, body: Record<string, unknown>) => patch<EventPanel>(endpoints.event(id), body),
  publish: (id: string) => post<EventPanel>(endpoints.eventSub(id, "publish")),
  setStatus: (id: string, status: string) => post<EventPanel>(endpoints.eventSub(id, "status"), { status }),
  addDivision: (id: string, body: Record<string, unknown>) => post(endpoints.eventSub(id, "divisions"), body),
  removeDivision: (id: string, divisionId: string) => del(endpoints.eventSub(id, `divisions/${divisionId}`)),
  registrations: (id: string, q: Record<string, string | undefined>) =>
    get<RegistrationRow[]>(endpoints.eventSub(id, "registrations"), q),
  register: (id: string, body: Record<string, unknown>) => post(endpoints.eventSub(id, "registrations"), body),
  decide: (id: string, rid: string, status: "approved" | "rejected") =>
    post(endpoints.eventSub(id, `registrations/${rid}/decision`), { status }),
  markPayment: (id: string, rid: string, paymentStatus: string) =>
    post(endpoints.eventSub(id, `registrations/${rid}/payment`), { paymentStatus }),
  bracket: (id: string, divisionId: string) => get<BracketView>(endpoints.eventSub(id, `brackets/${divisionId}`)),
  draw: (id: string, divisionId: string, separateTeams: boolean) =>
    post<BracketView>(endpoints.eventSub(id, `brackets/${divisionId}/draw`), { separateTeams }),
  publishBracket: (id: string, divisionId: string) =>
    post<BracketView>(endpoints.eventSub(id, `brackets/${divisionId}/publish`)),
  matchResult: (id: string, matchId: string, body: Record<string, unknown>) =>
    post<BracketView>(endpoints.eventSub(id, `matches/${matchId}/result`), body),
  weighIns: (id: string, divisionId?: string) => get<WeighInRow[]>(endpoints.eventSub(id, "weigh-ins"), { divisionId }),
  weighIn: (id: string, body: Record<string, unknown>) => post(endpoints.eventSub(id, "weigh-ins"), body),
  bouts: (id: string) => get<CardBout[]>(endpoints.eventSub(id, "bouts")),
  saveBout: (id: string, body: Record<string, unknown>, boutId?: string) =>
    boutId ? put(endpoints.eventSub(id, `bouts/${boutId}`), body) : post(endpoints.eventSub(id, "bouts"), body),
  boutResult: (id: string, boutId: string, body: Record<string, unknown>) =>
    post(endpoints.eventSub(id, `bouts/${boutId}/result`), body),
  opening: (id: string, body: Record<string, unknown>) => post(endpoints.eventSub(id, "openings"), body),
};

export interface TeamMemberRow {
  member_id: string;
  member_kind: "fighter" | "coach" | "provider";
  role: string;
  profile_id: string;
  display_name: string;
  slug: string;
  record_wins: number | null;
  record_losses: number | null;
  record_draws: number | null;
  weight_class: string | null;
  level: string | null;
}

export interface TeamPage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  members: TeamMemberRow[];
  counts: { fighters: number; coaches: number; providers: number };
  modalities: { id: string; name: string }[];
  teamPlanActive: boolean;
}

export const teamsService = {
  mine: () =>
    get<{ id: string; name: string; slug: string; role: string; member_kind: string; profile_id: string }[]>(
      "/teams/mine",
    ),
  page: (idOrSlug: string) => get<TeamPage>(`/teams/${idOrSlug}`),
  /** Fighters of every team where the user coaches. */
  myAthletes: async () => {
    const teams = (await teamsService.mine()).filter((t) => t.member_kind === "coach");
    const pages = await Promise.all(teams.map((t) => teamsService.page(t.id)));
    return pages.flatMap((p) =>
      p.members.filter((m) => m.member_kind === "fighter").map((m) => ({ ...m, team: p.name })),
    );
  },
};
