// DISTRIBUTOR is a new addition alongside MARKETER (not a replacement) — existing accounts already
// stored with role="MARKETER" are untouched; DISTRIBUTOR exists purely so new accounts can be
// created under a better-fitting label. Everywhere in this app that isn't specifically an
// admin-vs-not check treats the two identically (same outlet-scoping, same permissions).
export type AccountRole = "SUPER_ADMIN" | "MARKETER" | "DISTRIBUTOR";
// Matches the desktop app's own Business Profile screen exactly (reconciled 2026-07-24 — these two
// lists were built independently and didn't match at all before).
export type BusinessType =
  | "retail_shop"
  | "wholesale_shop"
  | "retail_and_wholesale"
  | "restaurant"
  | "hotel"
  | "pharmacy"
  | "electronics"
  | "hardware"
  | "general_store"
  | "supermarket"
  | "other";
export type Currency = "KES" | "UGX" | "TZS" | "USD";
export type LicenseStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type SuspensionReason = "PAYMENT_OVERDUE" | "FRAUD" | "MANUAL" | "CUSTOMER_REQUESTED";
export type SubscriptionType = "MONTHLY" | "LIFETIME" | "CUSTOM";
export type BillingCycle = "MONTHLY" | "YEARLY" | "ONCE";
export type SubscriptionBillingStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type SupportStatus = "ACTIVE" | "EXPIRED" | "LIFETIME";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED";
export type PlanStatus = "ACTIVE" | "INACTIVE";

export type Outlet = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutletCreateInput = {
  name: string;
  location?: string | null;
  notes?: string | null;
};

export type OutletUpdateInput = Partial<OutletCreateInput>;

/** The Till this outlet's own tenants pay their software subscription/maintenance into — mirrors
 * DESKTOP's per-storefront MpesaTillSettings shape exactly. */
export type OutletMpesaSettings = {
  id: string;
  outletId: string;
  environment: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  tillNumber: string;
  accountReference: string;
  createdAt: string;
  updatedAt: string;
};

export type OutletMpesaSettingsSaveInput = {
  environment: "sandbox" | "production";
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  tillNumber: string;
  accountReference?: string;
};

export type Plan = {
  id: string;
  outletId: string;
  name: string;
  monthlyPriceCents: number | null;
  purchasePriceCents: number | null;
  annualMaintenanceCents: number | null;
  maxBranches: number;
  maxUsers: number;
  maxDevices: number;
  supportLevel: string | null;
  description: string | null;
  status: PlanStatus;
  featureInventory: boolean;
  featureSales: boolean;
  featureQuotations: boolean;
  featurePurchaseOrders: boolean;
  featureExpenses: boolean;
  featurePayroll: boolean;
  featureCrm: boolean;
  featureMultiStore: boolean;
  featureCloudSync: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanCreateInput = {
  outletId: string;
  name: string;
  monthlyPriceCents?: number | null;
  purchasePriceCents?: number | null;
  annualMaintenanceCents?: number | null;
  maxBranches?: number;
  maxUsers?: number;
  maxDevices?: number;
  supportLevel?: string | null;
  description?: string | null;
  featureInventory?: boolean;
  featureSales?: boolean;
  featureQuotations?: boolean;
  featurePurchaseOrders?: boolean;
  featureExpenses?: boolean;
  featurePayroll?: boolean;
  featureCrm?: boolean;
  featureMultiStore?: boolean;
  featureCloudSync?: boolean;
};

export type PlanUpdateInput = Partial<Omit<PlanCreateInput, "outletId">> & { status?: PlanStatus };

export type License = {
  id: string;
  tenantId: string;
  licenseKey: string;
  status: LicenseStatus;
  trialEndsAt: string | null;
  suspensionReason: SuspensionReason | null;
  createdAt: string;
  updatedAt: string;
};

export type LicenseUpdateInput = {
  status: LicenseStatus;
  suspensionReason?: SuspensionReason | null;
  trialEndsAt?: string | null;
};

export type DeviceType = "DESKTOP" | "LAPTOP";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

export type Device = {
  id: string;
  tenantId: string;
  deviceName: string;
  deviceType: DeviceType;
  storefrontId: string | null;
  osName: string | null;
  appVersion: string | null;
  registeredAt: string;
  lastSeen: string | null;
  lastSync: string | null;
  status: DeviceStatus;
  licenseKeyUsed: string;
  createdAt: string;
  updatedAt: string;
};

/** Real synced storefront/warehouse data pushed up from the tenant's own desktop app (Phase 1
 * cloud sync) — `id` matches the id Device.storefrontId references, so devices can be grouped
 * under the location they belong to. */
export type Location = {
  id: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  phone: string | null;
  city: string | null;
  county: string | null;
  managerName: string | null;
  managerPhone: string | null;
  status: string;
  isInventoryLocation: boolean;
  canReceiveStock: boolean;
  canSellStock: boolean;
  canTransferStock: boolean;
  syncedAt: string;
};

export type Subscription = {
  id: string;
  tenantId: string;
  planId: string;
  plan: Plan;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  status: SubscriptionBillingStatus;
  startDate: string;
  nextDueDate: string | null;
  priceCents: number;
  maintenanceFeeCents: number | null;
  maintenanceExpiry: string | null;
  supportExpiry: string | null;
  supportStatus: SupportStatus;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionUpdateInput = Partial<{
  planId: string;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  status: SubscriptionBillingStatus;
  priceCents: number;
  maintenanceFeeCents: number | null;
  nextDueDate: string | null;
  maintenanceExpiry: string | null;
  supportExpiry: string | null;
  supportStatus: SupportStatus;
}>;

export type SubscriptionPayment = {
  id: string;
  tenantId: string;
  amountCents: number;
  currency: Currency;
  paymentMethod: string;
  transactionReference: string | null;
  billingPeriod: string;
  paymentDate: string;
  nextDueDateAfter: string | null;
  status: PaymentStatus;
  createdBy: string | null;
  createdAt: string;
};

export type SubscriptionPaymentCreateInput = {
  amountCents: number;
  currency: Currency;
  paymentMethod: string;
  // No cash option for subscription billing — every method produces some kind of reference code.
  transactionReference: string;
  billingPeriod: string;
  paymentDate?: string;
  nextDueDateAfter?: string | null;
  status?: PaymentStatus;
};

/** Mirrors SERVER's computePaymentSchedule (billing-periods.ts) / DESKTOP's own
 * shared/types/subscription-payment.ts — one shared shape so this dashboard, DESKTOP's own port,
 * and the "pay N periods in advance" STK flow can never disagree about which period a given date
 * falls in. "overdue" = unpaid and before the current period (red). "due" = unpaid and IS the
 * current period (amber, due now but not yet late). */
export type BillingPeriodEntry = {
  key: string;
  label: string;
  status: "paid" | "overdue" | "due" | "future";
};

export type PaymentScheduleResult = {
  billingCycle: BillingCycle;
  pricePerPeriodCents: number | null;
  currency: Currency;
  periods: BillingPeriodEntry[];
  nextDueDate: string | null;
};

export type BillingMpesaTransactionStatus =
  | "pending"
  | "success"
  | "insufficient"
  | "cancelled"
  | "wrong_pin"
  | "timeout"
  | "failed";

export type BillingMpesaStkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  amountCents: number;
  periods: string[];
};

export type BillingMpesaStatusResult = {
  status: BillingMpesaTransactionStatus;
  message: string;
  mpesaReceiptNumber: string | null;
  amountCents: number;
  phone: string;
};

export type BillingPesapalTransactionStatus = "pending" | "success" | "failed" | "reversed" | "invalid";

export type BillingPesapalSubmitOrderResult = {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
  amountCents: number;
  periods: string[];
  accountNumber: string | null;
};

export type BillingPesapalStatusResult = {
  status: BillingPesapalTransactionStatus;
  message: string;
  confirmationCode: string | null;
  paymentMethodDetail: string | null;
  amountCents: number;
};

/** Mirrors the API's JSON response shape for a tenant — dates arrive as ISO strings, not Date
 * objects, since this crosses a network boundary. License/Subscription are embedded (nullable only
 * in shape, never actually null in practice — every tenant gets both at creation time). */
export type Tenant = {
  id: string;
  name: string;
  slug: string;
  outletId: string;
  outlet: Outlet;
  businessType: BusinessType;
  timezone: string;
  currency: Currency;
  ownerName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  dbName: string;
  dbHost: string | null;
  dbPort: number | null;
  storefrontCount: number;
  lastCloudSync: string | null;
  pendingSyncRecords: number;
  notes: string | null;
  /** Per-tenant exception to the Plan's own maxDevices — null means "use the plan's value". */
  maxDevicesOverride: number | null;

  // Extended business-profile fields — normally kept current by the desktop app's own Business
  // Profile screen (pushed up via POST /activation/profile), editable here too as the other way in.
  businessRegistrationNumber: string | null;
  kraPin: string | null;
  email: string | null;
  alternativePhone: string | null;
  website: string | null;
  country: string | null;
  countyState: string | null;
  cityTown: string | null;
  physicalAddress: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;

  license: License | null;
  subscription: Subscription | null;
  locations: Location[];
  createdAt: string;
  updatedAt: string;
};

export type TenantCreateInput = {
  name: string;
  slug: string;
  outletId: string;
  businessType?: BusinessType;
  timezone?: string;
  currency?: Currency;
  ownerName?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  notes?: string | null;

  planId: string;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  priceCents: number;
  maintenanceFeeCents?: number | null;
  startDate?: string;
  // Defaults to TRIAL server-side if omitted — see billing-periods.ts's resolveBillingAnchorDate for
  // why trialEndsAt matters: without it, a trial tenant's billing clock starts immediately instead of
  // once their trial actually ends.
  licenseStatus?: "TRIAL" | "ACTIVE";
  trialEndsAt?: string | null;
};

export type TenantUpdateInput = Partial<{
  name: string;
  outletId: string;
  businessType: BusinessType;
  timezone: string;
  currency: Currency;
  ownerName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;

  businessRegistrationNumber: string | null;
  kraPin: string | null;
  email: string | null;
  alternativePhone: string | null;
  website: string | null;
  country: string | null;
  countyState: string | null;
  cityTown: string | null;
  physicalAddress: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  maxDevicesOverride: number | null;
}>;

/** The embedded outlet on an Account is just the bits worth showing — same shape as Outlet. */
export type Account = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  outletId: string | null;
  outlet: Outlet | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountCreateInput = {
  name: string;
  email: string;
  password: string;
  role?: AccountRole;
  outletId?: string | null;
  isActive?: boolean;
};

export type AccountUpdateInput = Partial<Omit<AccountCreateInput, "password">> & {
  password?: string;
};

// --- Online Store (e-commerce onboarding) ---
export type WebStoreStatus = "DRAFT" | "LIVE" | "SUSPENDED";
export type DomainStatus = "NONE" | "PENDING_DNS" | "VERIFYING_TLS" | "LIVE";

export type WebStore = {
  id: string;
  tenantId: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: DomainStatus;
  status: WebStoreStatus;
  fulfilmentLocationId: string | null;
  currency: string;
  themeJson: unknown;
  deliveryJson: unknown;
  paymentOptionsJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type ShopOverview = {
  store: WebStore | null;
  /** per-tenant à-la-carte flag */
  ecommerceEnabled: boolean;
  /** plan-tier flag */
  planFeatureEcommerce: boolean;
  storefrontBaseDomain: string;
  storefrontPublicHost: string | null;
  fulfilmentLocationName: string | null;
  publishedCount: number;
  activeProductCount: number;
  categoryCount: number;
};

export type ShopVerifyResult = ShopOverview & { detail: string };

export type ShopProvisionInput = {
  subdomain: string;
  currency?: string;
  fulfilmentLocationId?: string | null;
  customDomain?: string;
};

export type ShopUpdateInput = Partial<{
  subdomain: string;
  currency: string;
  fulfilmentLocationId: string | null;
  status: WebStoreStatus;
}>;

export type PublishableProduct = {
  id: string;
  name: string;
  sku: string;
  categoryName: string | null;
  sellingPriceCents: number;
  onlinePriceCents: number | null;
  publishedOnline: boolean;
};
