export type ProfileType = "organizer" | "fighter" | "coach" | "provider";
export type Stance = "orthodox" | "southpaw" | "switch";

export interface Named {
  id: string;
  code?: string;
  name: string;
}

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "boolean" | "url" | "date" | "file";
  options: string[];
  required: boolean;
  filterable: boolean;
  helpText: string | null;
}

/** Product area that can be active, locked ("coming soon") or hidden (table `modules` in the API). */
export interface ProductModule {
  code: ModuleCode;
  name: string;
  description: string | null;
  status: "active" | "locked" | "hidden";
  lockedTitle: string | null;
  lockedMessage: string | null;
  dependsOn: string[];
  /** Whether the current viewer can use it (testers and super admins see locked modules). */
  available: boolean;
}

export type ModuleCode =
  | "athlete"
  | "sparring"
  | "comparison"
  | "contacts"
  | "events"
  | "event_management"
  | "teams"
  | "services"
  | (string & {});

export interface Catalog {
  profileTypes: {
    code: ProfileType;
    name: string;
    description: string;
    onboardingSteps: string[];
    moduleCode: ModuleCode | null;
  }[];
  modalities: (Named & { usesBrackets: boolean; usesCard: boolean })[];
  levels: Named[];
  fightingStyles: Named[];
  graduationSystems: (Named & { graduations: Named[] })[];
  weightClasses: (Named & { modalityId: string; sex: string; maxKg: number | null; withGi: boolean | null })[];
  cities: (Named & { slug: string; lat: number; lng: number; districts: (Named & { slug: string })[] })[];
  serviceFamilies: (Named & {
    description: string;
    fields: FieldDefinition[];
    categories: (Named & {
      professionalTitle: string;
      featuredInOnboarding: boolean;
      onboardingLabel: string | null;
      fields: FieldDefinition[];
    })[];
  })[];
  eventStaffRoles: Named[];
  settings: Record<string, unknown>;
}

export interface PublicPlan {
  id: string;
  code: string;
  profileType: ProfileType;
  name: string;
  tier: number;
  highlightLabel: string | null;
  prices: { id: string; billingInterval: "month" | "year"; amountCents: number; currency: string }[];
  highlights: string[];
  features: Record<string, unknown>;
  moduleCode: ModuleCode | null;
  moduleStatus: ProductModule["status"];
}

export interface ScheduleSegment {
  fromCycle: number;
  toCycle: number | null;
  amountCents: number;
}

export interface Quote {
  baseAmountCents: number;
  listAmountCents: number;
  trialDays: number;
  courtesy: boolean;
  lines: {
    kind: string;
    id: string;
    label: string;
    discountType: string;
    value: number | null;
    cycles: number | null;
  }[];
  schedule: ScheduleSegment[];
  firstChargeCents: number;
  recurringCents: number;
}

export interface Subscription {
  id: string;
  profileId: string;
  status: "trialing" | "pending_payment" | "active" | "past_due" | "canceled" | "expired";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan?: { id: string; name: string; code: string; profileType: ProfileType; tier: number };
  planPrice?: { billingInterval: string; amountCents: number };
}

export interface OwnerProfile {
  id: string;
  type: ProfileType;
  displayName: string;
  slug: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "suspended";
  statusReason: string | null;
  onboardingStep: string | null;
  cityId: string | null;
  districtId: string | null;
  whatsapp: string | null;
  bio: string | null;
  avatarUrl: string | null;
  searchable: boolean;
  searchBlockers: { code: string; message: string }[];
  modalityIds: string[];
  photos: { kind: "front" | "side" | "back"; status: string; url: string | null }[];
  details: Record<string, unknown> | null;
  plan: { id: string; code: string; name: string; tier: number; status: string } | null;
  features: Record<string, unknown>;
}

export interface Me {
  user: { id: string; email: string | null; fullName: string | null; cityId: string | null };
  isAdmin: boolean;
  permissions: string[];
  profiles: OwnerProfile[];
  subscriptions: Subscription[];
  privacy: { profileHidden: boolean; allowComparison: boolean; showServiceRecords: boolean };
  pendingConsents: { type: string; version: string }[];
  unreadNotifications: number;
  availableModules: ModuleCode[];
  /** Profile types this account may still create (module open and combination allowed). */
  creatableProfileTypes: ProfileType[];
}

export interface SimilarityInfo {
  percent: number;
  summary: string;
}

export interface SparringResult {
  id: string;
  slug: string;
  displayName: string;
  fightName: string | null;
  team: string;
  city: string | null;
  district: string | null;
  heightCm: number | null;
  reachCm: number | null;
  fightWeightKg: number | null;
  currentWeightKg: number | null;
  stance: Stance | null;
  baseStyle: string | null;
  level: string | null;
  record: { wins: number; losses: number; draws: number };
  availability: { days?: string[]; periods?: string[]; radiusKm?: number; travelsForCamp?: boolean };
  distanceKm: number | null;
  similarity: SimilarityInfo | null;
  photos: Partial<Record<"front" | "side" | "back", string | null>>;
  highlighted: boolean;
}

export interface SparringSearchResponse {
  total: number;
  page: number;
  pageSize: number;
  results: SparringResult[];
}

export interface ProviderResult {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  district: string | null;
  distance_km: number | null;
  categories: { id: string; name: string; title: string; verified: boolean }[] | null;
  modalities: string[] | null;
  athletes_served: number;
  events_worked: number;
  highlighted: boolean;
  avatarUrl: string | null;
  requiresLogin: boolean;
}

export interface FightRecordItem {
  source: "platform" | "external";
  date: string;
  result: "win" | "loss" | "draw" | "no_contest";
  method: string | null;
  round: number | null;
  opponentName: string;
  eventName: string | null;
}

export interface PublicProfile {
  id: string;
  slug: string;
  type: ProfileType;
  displayName: string;
  avatarUrl: string | null;
  verifiedBadge: boolean;
  requiresLogin: boolean;
  city: string | null;
  district: string | null;
  modalities: string[] | null;
  team: string | null;
  fight_name?: string | null;
  stance?: Stance | null;
  height_cm?: number | null;
  reach_cm?: number | null;
  fight_weight_kg?: number | null;
  record_wins?: number;
  record_losses?: number;
  record_draws?: number;
  level?: string | null;
  base_style?: string | null;
  weight_class?: string | null;
  age?: number | null;
  current_weight_kg?: number | null;
  current_weight_at?: string | null;
  availability?: SparringResult["availability"];
  reference_price_cents?: number | null;
  reference_price_unit?: string | null;
  graduation?: string | null;
  photos?: { kind: string; url: string | null }[];
  recentFights?: FightRecordItem[];
  coaches?: { id: string; display_name: string; slug: string }[];
  bio?: string | null;
  categories?: { id: string; name: string; professional_title: string; verification_status: string }[];
  portfolio?: { id: string; kind: string; publicUrl: string | null; url: string | null; title: string | null }[];
  servedAthletes?: { total: number; featured: { id: string; display_name: string; slug: string }[] };
  eventsWorked?: { id: string; name: string; slug: string; starts_at: string; role: string }[];
  teams?: { id: string; name: string; slug: string; role?: string }[];
  events?: { id: string; name: string; slug: string; starts_at: string; status: string }[];
}

export interface AgendaEvent {
  id: string;
  name: string;
  slug: string;
  starts_at: string;
  level: "amateur" | "professional" | "mixed";
  format: string;
  status: string;
  venue_name: string | null;
  city: string | null;
  district: string | null;
  modalities: string[] | null;
  bouts: number;
  registrations_open: boolean;
  registrations_close_at: string | null;
  weigh_in_at: string | null;
  highlighted: boolean;
  posterUrl: string | null;
}

export interface Division {
  id: string;
  name: string;
  modality: string;
  sex: string;
  format: "bracket" | "card";
  status: string;
  registrations: number;
  weight_class: string | null;
  max_kg: number | null;
  max_weight_kg: number | null;
  bracket_status: string | null;
}

export interface CardBout {
  id: string;
  card_order: number;
  label: string | null;
  status: string;
  rounds: number;
  round_minutes: number;
  weight_limit_kg: number | null;
  weight_class: string | null;
  level: string | null;
  a_fighter_profile_id: string | null;
  a_name: string | null;
  a_slug?: string | null;
  a_team?: string | null;
  b_fighter_profile_id: string | null;
  b_name: string | null;
  b_slug?: string | null;
  b_team?: string | null;
  winner_side: string | null;
  method: string | null;
  result_round: number | null;
  /** Official weigh-ins of this bout (organizer panel only). */
  weigh_ins?: { fighterProfileId: string; weightKg: number; status: string }[] | null;
}

export interface EventPage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  startsAt: string;
  venueName: string | null;
  venueAddress: string | null;
  level: string;
  format: string;
  status: string;
  registrationFeeCents: number | null;
  registrationFeeText: string | null;
  registrationsCloseAt: string | null;
  weighInAt: string | null;
  paymentInstructions: string | null;
  posterUrl: string | null;
  organizer: { id: string; display_name: string; slug: string };
  divisions: Division[];
  card: CardBout[];
  teams: { id: string; name: string; slug: string; fighters: number }[];
  staff: { id: string; display_name: string; slug: string; role: string }[];
  registrationsOpen: boolean;
}

export interface EventPanel extends Omit<EventPage, "organizer" | "card" | "teams" | "staff"> {
  ownerProfileId: string;
  admins: { id: string; role: string; profile_id: string; display_name: string }[];
  counts: { registrations: number; approved: number; pending: number; paid: number };
  modalityIds: string[];
}

export interface RegistrationRow {
  id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "disqualified";
  payment_status: "unpaid" | "paid" | "waived";
  registered_by_kind: string;
  fighter_profile_id: string;
  fighter_name: string;
  team: string | null;
  division_id: string;
  division: string;
  registered_by: string | null;
}

export interface BracketMatchView {
  id: string;
  round: number;
  position: number;
  status: string;
  is_bye: boolean;
  a_registration_id: string | null;
  a_name: string | null;
  a_team: string | null;
  b_registration_id: string | null;
  b_name: string | null;
  b_team: string | null;
  winner_registration_id: string | null;
}

export interface BracketView {
  division: { id: string; name: string } | null;
  bracket: { id: string; status: string; drawSeed: number; separateTeams: boolean } | null;
  rounds: { round: number; label: string; matches: BracketMatchView[] }[];
}

export interface WeighInRow {
  registration_id: string;
  fighter_profile_id: string;
  display_name: string;
  team: string | null;
  division: string;
  limit_kg: number | null;
  weight_kg: number | null;
  status: string;
}

export interface ComparisonResult {
  locked: boolean;
  message?: string;
  sideA?: { id: string; displayName: string; fightName: string | null };
  sideB?: { id: string; displayName: string; fightName: string | null };
  summary?: { a: number; b: number; neutral: number; similarityPercent: number; totalIndicators: number };
  indicators?: { group: string; key: string; label: string; a: unknown; b: unknown; advantage: "a" | "b" | null }[];
  commonOpponents?: {
    opponent: string;
    a: { result: string; method: string | null; round: number | null };
    b: { result: string; method: string | null; round: number | null }[];
  }[];
  disclaimer?: string;
}
