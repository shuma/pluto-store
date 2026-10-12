import {
  BookOpenText,
  ShoppingBag,
  ImageIcon,
  Settings,
  Shield,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
// Shared by the sidebar and the header breadcrumb so a section has one name in
// both places.
export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  children?: NavItem[];
};
export const NAV: NavItem[] = [
  {
    title: "Your store",
    url: "/dashboard/store",
    icon: Store,
    // Pages that shape the store itself, nested under it in the sidebar.
    children: [
      {
        title: "Reference images",
        url: "/dashboard/store/reference-images",
        icon: ImageIcon,
      },
      {
        title: "Products",
        url: "/dashboard/store/products",
        icon: ShoppingBag,
      },
    ],
  },
  // Revenue and the orders behind it, like a creator's "My income".
  { title: "Income", url: "/dashboard/income", icon: Wallet },
  // Payouts and the account itself.
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];
// Reference material rather than something to manage, so the sidebar keeps it
// in its own group at the bottom.
export const HELP: NavItem[] = [
  {
    title: "Knowledge base",
    url: "/dashboard/knowledge-base",
    icon: BookOpenText,
  },
];
export const ADMIN: NavItem = { title: "Admin", url: "/admin", icon: Shield };
// Every page in the nav, children included, for matching a path to its page.
export const ALL_NAV = [...NAV, ...HELP, ADMIN].flatMap((item) => [
  item,
  ...(item.children ?? []),
]);
// On a page or anywhere beneath it; `/dashboard/store` is not active on
// `/dashboard/storefront`.
export const isActive = (pathname: string, url: string) =>
  pathname === url || pathname.startsWith(`${url}/`);
