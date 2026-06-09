// Single source of truth for admin-panel modules. Used by:
//  - the "Give access" dialog to render checkboxes
//  - the sidebar to hide modules a user can't access
//  - middleware / route handlers to gate access
//
// "key" must stay stable since it's persisted in `User.permissions`.

export type ModuleKey =
  | "dashboard"
  | "products"
  | "stock"
  | "categories"
  | "brands"
  | "product-brands"
  | "bike-models"
  | "orders"
  | "expenses"
  | "users"
  | "trade-requests"
  | "trade-discounts"
  | "suppliers"
  | "purchase-orders"
  | "stock-received"
  | "couriers"
  | "offers"
  | "payments"
  | "activity"
  // Reports module — `reports.view` covers operational reports (stock,
  // sales). `reports.financial` adds the sensitive ones (P&L, customer
  // revenue). ADMIN gets both implicitly via canAccessModule.
  | "reports.view"
  | "reports.financial";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  href: string;
  group: "Overview" | "Catalogue" | "Sales" | "Marketing" | "People" | "Trader management" | "Procurement" | "Shipping" | "Audit" | "Reports";
};

export const ADMIN_MODULES: ModuleDef[] = [
  { key: "dashboard",      label: "Dashboard",      href: "/admin",                  group: "Overview" },
  { key: "products",       label: "Products",       href: "/admin/products",         group: "Catalogue" },
  { key: "stock",          label: "Stock",          href: "/admin/stock",            group: "Catalogue" },
  { key: "categories",     label: "Categories",     href: "/admin/categories",       group: "Catalogue" },
  { key: "brands",         label: "Bike Brands",    href: "/admin/brands",           group: "Catalogue" },
  { key: "product-brands", label: "Product Brands", href: "/admin/product-brands",   group: "Catalogue" },
  { key: "bike-models",    label: "Bike Models",    href: "/admin/bike-models",      group: "Catalogue" },
  { key: "orders",         label: "Orders",         href: "/admin/orders",           group: "Sales" },
  { key: "payments",       label: "Payments",       href: "/admin/payments",         group: "Sales" },
  { key: "expenses",       label: "Expenses",       href: "/admin/expenses",         group: "Sales" },
  { key: "offers",         label: "Offers",         href: "/admin/offers",           group: "Marketing" },
  { key: "users",          label: "Users",          href: "/admin/users",            group: "People" },
  { key: "trade-requests", label: "Trade Requests", href: "/admin/trade-requests",   group: "Trader management" },
  { key: "trade-discounts",label: "Trade Discounts",href: "/admin/trade-discounts",  group: "Trader management" },
  { key: "suppliers",      label: "Suppliers",      href: "/admin/suppliers",        group: "Procurement" },
  { key: "purchase-orders",label: "Purchase Orders",href: "/admin/purchase-orders",  group: "Procurement" },
  { key: "stock-received", label: "Stock Received", href: "/admin/stock-received",   group: "Procurement" },
  { key: "couriers",       label: "Couriers",       href: "/admin/couriers",         group: "Shipping" },
  { key: "activity",       label: "Activity log",   href: "/admin/activity",         group: "Audit" },
  { key: "reports.view",      label: "Sales & Stock", href: "/admin/reports/sales",     group: "Reports" },
  { key: "reports.financial", label: "Financial",     href: "/admin/reports/financial", group: "Reports" },
];

export const ALL_MODULE_KEYS: ModuleKey[] = ADMIN_MODULES.map((m) => m.key);

/** ADMIN has implicit full access; everyone else is gated by their list. */
export function canAccessModule(
  role: string | undefined,
  permissions: string[] | undefined,
  key: ModuleKey,
): boolean {
  if (role === "ADMIN") return true;
  return Array.isArray(permissions) && permissions.includes(key);
}
