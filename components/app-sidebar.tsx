"use client";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { post } from "@/lib/client-api";
import { PlutoGlobe } from "@/components/pluto-globe";
import { ADMIN, HELP, NAV, isActive } from "@/components/dashboard-nav";
export function AppSidebar({
  email,
  admin,
}: {
  email: string;
  admin: boolean;
}) {
  const pathname = usePathname(),
    router = useRouter(),
    { isMobile } = useSidebar(),
    { theme, setTheme } = useTheme();
  const items = admin ? [...NAV, ADMIN] : NAV;
  return (
    <Sidebar collapsible="icon">
      {/* The collapse toggle sits beside the mark, and drops below it when the
          sidebar is collapsed to icons since the rail is one icon wide. */}
      <SidebarHeader className="flex-row items-center group-data-[collapsible=icon]:flex-col">
        <SidebarMenu className="min-w-0 flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard/store">
                {/* paperColor matches --sidebar (oklch 0.985) in light mode. */}
                <PlutoGlobe className="size-8" paperColor="#fafafa" />
                <div className="grid flex-1 text-left text-sm">
                  <span className="truncate font-medium">Pluto</span>
                  <span className="truncate text-xs">Creator store</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <Fragment key={item.url}>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    // A parent is only active on its own page; on a child's page
                    // the child carries the highlight.
                    isActive={
                      item.children
                        ? pathname === item.url
                        : isActive(pathname, item.url)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(pathname, child.url)}
                          >
                            <Link href={child.url}>
                              <child.icon />
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
                {/* Collapsed to icons there is no room for a sub-menu, so the
                  children stand in the rail as icons of their own. */}
                {item.children?.map((child) => (
                  <SidebarMenuItem
                    key={child.url}
                    className="hidden group-data-[collapsible=icon]:block"
                  >
                    <SidebarMenuButton
                      asChild
                      tooltip={child.title}
                      isActive={isActive(pathname, child.url)}
                    >
                      <Link href={child.url}>
                        <child.icon />
                        <span>{child.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </Fragment>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarMenu>
            {HELP.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive(pathname, item.url)}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {email.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm">
                    <span className="truncate font-medium">Signed in</span>
                    <span className="truncate text-xs">{email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  Appearance
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={async () => {
                      await post("/api/auth/logout", {});
                      router.push("/auth/login");
                      router.refresh();
                    }}
                  >
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
