import { get } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Catalog, ProfileType, PublicPlan } from "@/types/domain";

export const catalogService = {
  catalog: () => get<Catalog>(endpoints.catalog),
  plans: (profileType?: ProfileType) => get<PublicPlan[]>(endpoints.plans, profileType ? { profileType } : undefined),
};
