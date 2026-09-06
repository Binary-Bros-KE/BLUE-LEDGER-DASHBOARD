import type {
  Account,
  AccountCreateInput,
  AccountUpdateInput,
  BillingMpesaStatusResult,
  BillingMpesaStkPushResult,
  BillingPesapalStatusResult,
  BillingPesapalSubmitOrderResult,
  Device,
  License,
  LicenseUpdateInput,
  Outlet,
  OutletCreateInput,
  OutletMpesaSettings,
  OutletMpesaSettingsSaveInput,
  OutletUpdateInput,
  PaymentScheduleResult,
  Plan,
  PlanCreateInput,
  PlanUpdateInput,
  ShopOverview,
  ShopProvisionInput,
  ShopUpdateInput,
  ShopVerifyResult,
  Subscription,
  SubscriptionPayment,
  SubscriptionPaymentCreateInput,
  SubscriptionUpdateInput,
  Tenant,
  TenantCreateInput,
  TenantUpdateInput,
} from "./types";

// The only place this app knows the API's address — change NEXT_PUBLIC_API_URL in .env.local
// (or the real deployment env) and nothing else needs to change.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const TOKEN_STORAGE_KEY = "bl_admin_token";

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/** A 401 means the token is missing/expired/invalid — there's no refresh flow, so the only correct
 * move is to drop it and send the user back to login. A hard reload (not router.push) guarantees
 * every bit of stale in-memory state (AuthProvider included) resets cleanly. */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL is not configured — check .env.local");
  }

  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, body?.error ?? "Session expired");
  }

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.fieldErrors);
  }

  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; account: Account }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<Account>("/auth/me"),

  listTenants: () => request<Tenant[]>("/tenants"),
  getTenant: (id: string) => request<Tenant>(`/tenants/${id}`),
  createTenant: (input: TenantCreateInput) =>
    request<Tenant>("/tenants", { method: "POST", body: JSON.stringify(input) }),
  updateTenant: (id: string, input: TenantUpdateInput) =>
    request<Tenant>(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteTenant: (id: string) => request<void>(`/tenants/${id}`, { method: "DELETE" }),

  updateSubscription: (tenantId: string, input: SubscriptionUpdateInput) =>
    request<Subscription>(`/tenants/${tenantId}/subscription`, { method: "PATCH", body: JSON.stringify(input) }),

  suspendLicense: (tenantId: string, reason: string) =>
    request<License>(`/tenants/${tenantId}/license/suspend`, { method: "POST", body: JSON.stringify({ reason }) }),
  reactivateLicense: (tenantId: string) =>
    request<License>(`/tenants/${tenantId}/license/reactivate`, { method: "POST" }),
  updateLicense: (tenantId: string, input: LicenseUpdateInput) =>
    request<License>(`/tenants/${tenantId}/license`, { method: "PATCH", body: JSON.stringify(input) }),

  listPayments: (tenantId: string) => request<SubscriptionPayment[]>(`/tenants/${tenantId}/payments`),
  recordPayment: (tenantId: string, input: SubscriptionPaymentCreateInput) =>
    request<SubscriptionPayment>(`/tenants/${tenantId}/payments`, { method: "POST", body: JSON.stringify(input) }),
  getPaymentSchedule: (tenantId: string) =>
    request<PaymentScheduleResult>(`/tenants/${tenantId}/payment-schedule`),

  // Admin-triggered billing M-Pesa STK — a SUPER_ADMIN paying on a client's behalf (e.g. over a
  // support call), identified by tenantId instead of a license key.
  sendBillingStkPush: (tenantId: string, phone: string, periodCount: number) =>
    request<BillingMpesaStkPushResult>("/billing-mpesa/admin/stk-push", {
      method: "POST",
      body: JSON.stringify({ tenantId, phone, periodCount }),
    }),
  getBillingStkStatus: (tenantId: string, checkoutRequestId: string) =>
    request<BillingMpesaStatusResult>("/billing-mpesa/admin/status", {
      method: "POST",
      body: JSON.stringify({ tenantId, checkoutRequestId }),
    }),
  checkBillingStkStatus: (tenantId: string, checkoutRequestId: string) =>
    request<BillingMpesaStatusResult>("/billing-mpesa/admin/status/check", {
      method: "POST",
      body: JSON.stringify({ tenantId, checkoutRequestId }),
    }),

  // Admin-triggered billing Pesapal (Card/PayPal) — same shape/reasoning as the M-Pesa trio above.
  submitBillingPesapalOrder: (tenantId: string, periodCount: number, enrollAutoBilling: boolean) =>
    request<BillingPesapalSubmitOrderResult>("/billing-pesapal/admin/submit-order", {
      method: "POST",
      body: JSON.stringify({ tenantId, periodCount, enrollAutoBilling }),
    }),
  getPesapalStatus: (tenantId: string, orderTrackingId: string) =>
    request<BillingPesapalStatusResult>("/billing-pesapal/admin/status", {
      method: "POST",
      body: JSON.stringify({ tenantId, orderTrackingId }),
    }),
  checkPesapalStatus: (tenantId: string, orderTrackingId: string) =>
    request<BillingPesapalStatusResult>("/billing-pesapal/admin/status/check", {
      method: "POST",
      body: JSON.stringify({ tenantId, orderTrackingId }),
    }),

  // Online Store (e-commerce onboarding)
  getShopOverview: (tenantId: string) => request<ShopOverview>(`/tenants/${tenantId}/shop`),
  provisionShop: (tenantId: string, input: ShopProvisionInput) =>
    request<ShopOverview>(`/tenants/${tenantId}/shop`, { method: "POST", body: JSON.stringify(input) }),
  updateShop: (tenantId: string, input: ShopUpdateInput) =>
    request<ShopOverview>(`/tenants/${tenantId}/shop`, { method: "PATCH", body: JSON.stringify(input) }),
  setShopDomain: (tenantId: string, customDomain: string | null) =>
    request<ShopOverview>(`/tenants/${tenantId}/shop/domain`, {
      method: "POST",
      body: JSON.stringify({ customDomain }),
    }),
  verifyShopDomain: (tenantId: string) =>
    request<ShopVerifyResult>(`/tenants/${tenantId}/shop/domain/verify`, { method: "POST" }),
  // Publishing products + online price/description/photos is done by the shop owner from the
  // desktop POS "Online Store" tab, not here — the dashboard only owns provisioning + domains.

  listDevices: (tenantId: string) => request<Device[]>(`/tenants/${tenantId}/devices`),
  renameDevice: (tenantId: string, deviceId: string, deviceName: string) =>
    request<Device>(`/tenants/${tenantId}/devices/${deviceId}`, {
      method: "PATCH",
      body: JSON.stringify({ deviceName }),
    }),

  listPlans: () => request<Plan[]>("/plans"),
  getPlan: (id: string) => request<Plan>(`/plans/${id}`),
  createPlan: (input: PlanCreateInput) => request<Plan>("/plans", { method: "POST", body: JSON.stringify(input) }),
  updatePlan: (id: string, input: PlanUpdateInput) =>
    request<Plan>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deletePlan: (id: string) => request<void>(`/plans/${id}`, { method: "DELETE" }),

  listOutlets: () => request<Outlet[]>("/outlets"),
  createOutlet: (input: OutletCreateInput) =>
    request<Outlet>("/outlets", { method: "POST", body: JSON.stringify(input) }),
  updateOutlet: (id: string, input: OutletUpdateInput) =>
    request<Outlet>(`/outlets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteOutlet: (id: string) => request<void>(`/outlets/${id}`, { method: "DELETE" }),
  getOutletMpesaSettings: (id: string) => request<OutletMpesaSettings | null>(`/outlets/${id}/mpesa-settings`),
  saveOutletMpesaSettings: (id: string, input: OutletMpesaSettingsSaveInput) =>
    request<OutletMpesaSettings>(`/outlets/${id}/mpesa-settings`, { method: "PUT", body: JSON.stringify(input) }),

  listAccounts: () => request<Account[]>("/accounts"),
  createAccount: (input: AccountCreateInput) =>
    request<Account>("/accounts", { method: "POST", body: JSON.stringify(input) }),
  updateAccount: (id: string, input: AccountUpdateInput) =>
    request<Account>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteAccount: (id: string) => request<void>(`/accounts/${id}`, { method: "DELETE" }),
};
