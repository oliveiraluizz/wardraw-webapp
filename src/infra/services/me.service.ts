import { get, post, put, patch, del, uploadToSignedUrl } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Me, OwnerProfile, ProfileType, Quote, Subscription } from "@/types/domain";

export const meService = {
  me: () => get<Me>(endpoints.me),
  consent: (type: string, granted: boolean) => post(endpoints.meConsents, { type, granted }),
  updatePrivacy: (body: Partial<Me["privacy"]>) => put(endpoints.mePrivacy, body),
  requestDeletion: (reason?: string) => post(endpoints.meDeletion, { reason }),
  notifications: () =>
    get<{ id: string; title: string; body: string | null; readAt: string | null; createdAt: string }[]>(
      endpoints.meNotifications,
    ),
  markAllRead: () => post(endpoints.meNotificationsRead, {}),
};

export const profilesService = {
  create: (body: { type: ProfileType; displayName: string; cityId?: string; districtId?: string }) =>
    post<OwnerProfile>(endpoints.myProfiles, body),
  get: (id: string) => get<OwnerProfile>(endpoints.myProfile(id)),
  update: (id: string, body: Record<string, unknown>) => patch<OwnerProfile>(endpoints.myProfile(id), body),
  action: <T = OwnerProfile>(id: string, path: string, body: unknown, method: "patch" | "put" | "post" = "patch") =>
    (method === "patch" ? patch<T> : method === "put" ? put<T> : post<T>)(endpoints.myProfileAction(id, path), body),
  submit: (id: string) => post<OwnerProfile>(endpoints.myProfileAction(id, "submit")),
  remove: (id: string) => del(endpoints.myProfile(id)),
  /** Two-step upload: ask the API for a signed URL, PUT the file there, then confirm the path. */
  uploadPhoto: async (id: string, kind: "front" | "side" | "back", file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const { path, uploadUrl } = await post<{ path: string; uploadUrl: string }>(
      endpoints.myProfileAction(id, "fighter/photos/upload-url"),
      { kind, extension: ext },
    );
    await uploadToSignedUrl(uploadUrl, file);
    return put<OwnerProfile>(endpoints.myProfileAction(id, `fighter/photos/${kind}`), { path });
  },
  uploadPublic: async (id: string, purpose: "avatar" | "poster" | "logo" | "portfolio" | "document", file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const { path, uploadUrl } = await post<{ path: string; uploadUrl: string }>(
      endpoints.myProfileAction(id, "upload-url"),
      { purpose, extension: ext },
    );
    await uploadToSignedUrl(uploadUrl, file);
    return path;
  },
};

export const billingService = {
  quote: (body: { planPriceId: string; profileId?: string; couponCode?: string }) =>
    post<{ quote: Quote }>(endpoints.billingQuote, body),
  subscribe: (body: { profileId: string; planPriceId: string; couponCode?: string }) =>
    post<{ subscription: Subscription; quote: Quote }>(endpoints.subscriptions, body),
  changePlan: (id: string, planPriceId: string) => post(endpoints.subscription(id, "change-plan"), { planPriceId }),
  cancel: (id: string) => post(endpoints.subscription(id, "cancel"), {}),
  resume: (id: string) => post(endpoints.subscription(id, "resume"), {}),
};
