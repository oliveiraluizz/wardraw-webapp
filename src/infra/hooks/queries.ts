import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleCode, ProfileType } from "@/types/domain";
import { adminService } from "../services/admin.service";
import { catalogService } from "../services/catalog.service";
import { eventsService } from "../services/events.service";
import { meService, profilesService } from "../services/me.service";
import { searchService, type SparringQuery } from "../services/search.service";

/** Query key factories: invalidate by prefix (e.g. keys.events.all) after mutations. */
export const keys = {
  catalog: ["catalog"] as const,
  plans: (type?: ProfileType) => ["plans", type ?? "all"] as const,
  modules: (userId?: string) => ["modules", userId ?? "visitor"] as const,
  me: ["me"] as const,
  profile: (id: string) => ["profile", id] as const,
  sparring: (q: SparringQuery) => ["sparring", q] as const,
  providers: (q: object) => ["providers", q] as const,
  events: {
    all: ["events"] as const,
    agenda: (q: object) => ["events", "agenda", q] as const,
    page: (id: string) => ["events", "page", id] as const,
    mine: ["events", "mine"] as const,
    panel: (id: string) => ["events", "panel", id] as const,
    registrations: (id: string, q: object) => ["events", "registrations", id, q] as const,
    bracket: (id: string, divisionId: string) => ["events", "bracket", id, divisionId] as const,
    weighIns: (id: string, divisionId?: string) => ["events", "weighIns", id, divisionId] as const,
    bouts: (id: string) => ["events", "bouts", id] as const,
  },
  admin: {
    all: ["admin"] as const,
    resources: ["admin", "resources"] as const,
    list: (name: string, params: object) => ["admin", "list", name, params] as const,
    matrix: ["admin", "matrix"] as const,
    coupons: ["admin", "coupons"] as const,
    settings: ["admin", "settings"] as const,
    moderation: (kind: string) => ["admin", "moderation", kind] as const,
    metrics: ["admin", "metrics"] as const,
  },
};

const HOUR = 60 * 60 * 1000;

export const useCatalog = () => useQuery({ queryKey: keys.catalog, queryFn: catalogService.catalog, staleTime: HOUR });
/** Product modules for the current viewer; refreshed often so a module opened in the admin shows up quickly. */
export const useModules = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: keys.modules(session?.user.id),
    queryFn: catalogService.modules,
    staleTime: 60_000,
  });
};

/** `available` while loading avoids flashing the lock for areas that are open. */
export const useModule = (code: ModuleCode) => {
  const query = useModules();
  const module = query.data?.find((m) => m.code === code);
  return {
    module,
    isLoading: query.isLoading,
    available: query.isLoading || !module || module.available,
    hidden: !!module && !module.available && module.status === "hidden",
  };
};

/** Profile types belong to modules (organizer → event_management, ...): locked types show "coming soon". */
export const useProfileTypeModules = () => {
  const { data: catalog } = useCatalog();
  const { data: modules } = useModules();
  const moduleOf = (type: ProfileType) => catalog?.profileTypes.find((t) => t.code === type)?.moduleCode ?? null;
  const isLocked = (type: ProfileType) => {
    const module = modules?.find((m) => m.code === moduleOf(type));
    return !!module && !module.available;
  };
  return { moduleOf, isLocked };
};

/** `profiles.type_combinations`: how many profile types one account may hold (public setting). */
export const useMaxProfileTypes = () => {
  const { data: catalog } = useCatalog();
  const policy = catalog?.settings["profiles.type_combinations"] as { maxTypesPerAccount?: number } | undefined;
  return policy?.maxTypesPerAccount ?? 1;
};

export const usePlans = (type?: ProfileType) =>
  useQuery({ queryKey: keys.plans(type), queryFn: () => catalogService.plans(type), staleTime: 10 * 60_000 });

export const useMe = () => {
  const { session } = useAuth();
  return useQuery({ queryKey: keys.me, queryFn: meService.me, enabled: !!session, staleTime: 30_000 });
};

export const usePublicProfile = (idOrSlug: string | undefined, source?: string) =>
  useQuery({
    queryKey: keys.profile(idOrSlug ?? ""),
    queryFn: () => searchService.profile(idOrSlug!, source),
    enabled: !!idOrSlug,
  });

export const useSparringSearch = (q: SparringQuery | null) =>
  useQuery({
    queryKey: keys.sparring(q ?? ({} as SparringQuery)),
    queryFn: () => searchService.sparring(q!),
    enabled: !!q,
    placeholderData: keepPreviousData,
    retry: false,
  });

export const useProviderSearch = (q: Record<string, unknown>) =>
  useQuery({
    queryKey: keys.providers(q),
    queryFn: () => searchService.providers(q),
    placeholderData: keepPreviousData,
  });

export const useAgenda = (q: Record<string, unknown>, enabled = true) =>
  useQuery({
    queryKey: keys.events.agenda(q),
    queryFn: () => eventsService.agenda(q),
    placeholderData: keepPreviousData,
    enabled,
  });
export const useEventPage = (id?: string) =>
  useQuery({ queryKey: keys.events.page(id ?? ""), queryFn: () => eventsService.page(id!), enabled: !!id });
export const useMyEvents = (enabled = true) =>
  useQuery({ queryKey: keys.events.mine, queryFn: eventsService.myEvents, enabled });
export const useEventPanel = (id?: string) =>
  useQuery({ queryKey: keys.events.panel(id ?? ""), queryFn: () => eventsService.panel(id!), enabled: !!id });

/** Mutations that change event data invalidate every events query. */
export function useEventMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: keys.events.all }) });
}

export function useMeMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }) });
}

export function useAdminMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.admin.all });
      void qc.invalidateQueries({ queryKey: keys.catalog });
      void qc.invalidateQueries({ queryKey: ["plans"] });
      void qc.invalidateQueries({ queryKey: ["modules"] });
    },
  });
}

export { adminService, eventsService, meService, profilesService, searchService };
