import { get, post } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Catalog, ProductModule, ProfileType, PublicPlan } from "@/types/domain";

export const catalogService = {
  catalog: () => get<Catalog>(endpoints.catalog),
  plans: (profileType?: ProfileType) => get<PublicPlan[]>(endpoints.plans, profileType ? { profileType } : undefined),
  /** Modules with "available" computed for the signed-in user (or for visitors). */
  modules: () => get<ProductModule[]>(endpoints.modules),
  /** "Avise-me": signed-in users are recorded by account; visitors send an e-mail. */
  moduleInterest: (code: string, email?: string) => post<{ module: string }>(endpoints.moduleInterest(code), { email }),
};
