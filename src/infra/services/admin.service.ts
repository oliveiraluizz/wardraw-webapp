import { del, get, getPage, patch, post, put } from "../api/client";
import { endpoints } from "../api/endpoints";

export interface ResourceField {
  field: string;
  kind: "uuid" | "string" | "boolean" | "integer" | "number" | "date" | "datetime" | "json" | "string[]";
  nullable: boolean;
  hasDefault: boolean;
  primaryKey: boolean;
  enum?: string[];
  references?: string;
  writable: boolean;
}

export interface ResourceMeta {
  name: string;
  label: string;
  permission: string;
  softDelete: boolean;
  fields: ResourceField[];
}

type Row = Record<string, unknown> & { id?: string };

export const adminService = {
  resources: () => get<ResourceMeta[]>(endpoints.admin.resources),
  list: (name: string, params: Record<string, unknown>) => getPage<Row>(endpoints.admin.resource(name), params),
  create: (name: string, body: Row) => post<Row>(endpoints.admin.resource(name), body),
  update: (name: string, id: string, body: Row) => patch<Row>(endpoints.admin.resourceItem(name, id), body),
  remove: (name: string, id: string) => del(endpoints.admin.resourceItem(name, id)),
  matrix: () =>
    get<{
      plans: (Row & {
        id: string;
        name: string;
        profileType: string;
        tier: number;
        prices: { id: string; billingInterval: string; amountCents: number }[];
      })[];
      features: (Row & { id: string; key: string; name: string; valueType: string; category: string })[];
      values: { planId: string; featureId: string; value: unknown; inheritsToTeamMembers: boolean }[];
    }>(endpoints.admin.matrix),
  setPlanFeature: (planId: string, key: string, value: unknown, inheritsToTeamMembers?: boolean) =>
    put(endpoints.admin.planFeature(planId, key), { value, inheritsToTeamMembers }),
  reprice: (planId: string, body: { billingInterval: "month" | "year"; amountCents: number; alsoAnnual?: boolean }) =>
    post(endpoints.admin.reprice(planId), body),
  coupons: (q?: string) => get<(Row & { redemptions: number })[]>(endpoints.admin.coupons, { q }),
  coupon: (id: string) =>
    get<Row & { targets: Row[]; audiences: Row[]; redemptions: number }>(endpoints.admin.coupon(id)),
  saveCoupon: (body: Row, id?: string) =>
    id ? put<Row>(endpoints.admin.coupon(id), body) : post<Row>(endpoints.admin.coupons, body),
  quotePreview: (body: Row) => post<Row>(endpoints.admin.quotePreview, body),
  settings: () =>
    get<{ key: string; value: unknown; valueSchema: unknown; description: string; category: string }[]>(
      endpoints.admin.settings,
    ),
  updateSetting: (key: string, value: unknown) => put(endpoints.admin.setting(key), { value }),
  subscriptions: (params: Record<string, unknown>) => getPage<Row>(endpoints.admin.subscriptions, params),
  markPaid: (id: string, body: Row) => post(endpoints.admin.markPaid(id), body),
  patchSubscription: (id: string, body: Row) => patch(endpoints.admin.subscription(id), body),
  users: (q?: string) => getPage<Row>(endpoints.admin.users, { q }),
  userBilling: (id: string) => get<Row>(endpoints.admin.userBilling(id)),
  moderationProfiles: (status?: string) => get<Row[]>(endpoints.admin.moderationProfiles, { status }),
  decideProfile: (id: string, action: string, reason?: string) =>
    post(`${endpoints.admin.moderationProfiles}/${id}`, { action, reason }),
  moderationEvents: () => get<Row[]>(endpoints.admin.moderationEvents),
  decideEvent: (id: string, approve: boolean, notes?: string) =>
    post(`${endpoints.admin.moderationEvents}/${id}`, { approve, notes }),
  verifications: () => get<Row[]>(endpoints.admin.verifications),
  decideVerification: (id: string, approve: boolean, notes?: string) =>
    post(`${endpoints.admin.verifications}/${id}`, { approve, notes }),
  reports: () => get<Row[]>(endpoints.admin.reports),
  handleReport: (id: string, status: string, notes?: string) =>
    post(`${endpoints.admin.reports}/${id}`, { status, notes }),
  metrics: () => get<Row>(endpoints.admin.metrics),
};
