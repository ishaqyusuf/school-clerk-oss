"use client";
import { linkModules } from "@/components/sidebar/links";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@school-clerk/ui/cn";
import { Icons } from "@school-clerk/ui/custom/icons";
import { MobileMenu } from "@school-clerk/ui/nav/mobile-menu";
import { SidebarLayout } from "@school-clerk/ui/nav/sidebar";
import { useSidebarContext } from "@school-clerk/ui/nav/use-sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarClient() {
  const auth = useAuth({
    required: true,
  });
  const pathname = usePathname();
  const value = {
    linkModules: linkModules,
    auth: auth as any,
    pathname,
    Link,
    Logo: Icons.LogoIcons.Variant3,
  };
  const ctx = useSidebarContext(value);

  if (!auth?.profile?.schoolId) return null;
  return <SidebarLayout context={ctx} />;
}
