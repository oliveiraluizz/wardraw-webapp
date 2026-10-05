import { useMemo } from "react";
import type { OwnerProfile, ProfileType } from "@/types/domain";
import { useMe } from "./queries";

const PREFERENCE: ProfileType[] = ["fighter", "coach", "organizer", "provider"];

/** The profile used to act on the site (search, compare, contact). Prefers the requested type. */
export function useActiveProfile(prefer?: ProfileType[]): {
  profile: OwnerProfile | null;
  profiles: OwnerProfile[];
  isLoading: boolean;
} {
  const { data: me, isLoading } = useMe();
  return useMemo(() => {
    const profiles = me?.profiles ?? [];
    const order = prefer ?? PREFERENCE;
    const profile = order.map((t) => profiles.find((p) => p.type === t)).find(Boolean) ?? profiles[0] ?? null;
    return { profile, profiles, isLoading };
  }, [me, isLoading, prefer]);
}
