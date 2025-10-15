"use client";
import { redirect } from "next/navigation";

export default function AccountLayout({ children }: any) {
  // if (session.role?.name == "Dealer") redirect("/orders");

  return <>{children}</>;
}
