"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ALL_NAV, NAV, isActive } from "@/components/dashboard-nav";
export function DashboardBreadcrumb() {
  const pathname = usePathname();
  // The most specific match, so a child page names itself, not its parent.
  const section = ALL_NAV.filter((item) => isActive(pathname, item.url)).sort(
    (a, b) => b.url.length - a.url.length,
  )[0];
  const root = NAV[0];
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {section && section !== root ? (
          <>
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink asChild>
                <Link href={root.url}>{root.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{section.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{root.title}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
