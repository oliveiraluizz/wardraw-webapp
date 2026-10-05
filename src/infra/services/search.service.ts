import { get, getPage, post } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { ComparisonResult, ProviderResult, PublicProfile, SparringSearchResponse } from "@/types/domain";

export interface SparringQuery {
  asProfileId: string;
  mode: "filters" | "opponent";
  opponent?: {
    heightCm?: number;
    reachCm?: number;
    fightWeightKg?: number;
    stance?: string;
    baseStyleId?: string;
    levelId?: string;
  };
  heightCm?: { min?: number; max?: number };
  reachCm?: { min?: number; max?: number };
  fightWeightKg?: { min?: number; max?: number };
  stances?: string[];
  baseStyleIds?: string[];
  levelIds?: string[];
  modalityIds?: string[];
  periods?: string[];
  travelsForCamp?: boolean;
  nearCityId?: string;
  radiusKm?: number;
  sort?: "similarity" | "distance" | "record";
  page?: number;
}

export const searchService = {
  sparring: (q: SparringQuery) => post<SparringSearchResponse>(endpoints.searchSparring, q),
  providers: (q: Record<string, unknown>) =>
    post<{ total: number; results: ProviderResult[] }>(endpoints.searchProviders, q),
  providerCounts: (cityId?: string) =>
    get<{ id: string; name: string; family_id: string; providers: number }[]>(endpoints.providerCounts, { cityId }),
  profile: (idOrSlug: string, source?: string) =>
    get<PublicProfile>(endpoints.profile(idOrSlug), source ? { source } : undefined),
  compare: (asProfileId: string, sideA: string, sideB: string) =>
    get<ComparisonResult>(endpoints.comparison, { asProfileId, sideA, sideB }),
  compareOptions: (asProfileId: string) =>
    get<{ mode: string; fighters: { id: string; displayName: string }[]; anyFighter?: boolean }>(
      endpoints.comparisonOptions,
      { asProfileId },
    ),
  whatsapp: (body: { fromProfileId: string; toProfileId: string; context?: string }) =>
    post<{ url: string }>(endpoints.contactWhatsapp, body),
  report: (body: { subjectType: string; subjectId: string; reason: string; details?: string }) =>
    post(endpoints.reports, body),
  _page: getPage,
};
