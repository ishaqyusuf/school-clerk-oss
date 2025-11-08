import { constructMetadata } from "@/utils/construct-metadata";
import { Client } from "./client";

export async function generateMetadata() {
  return constructMetadata({
    title: `Forgot Password - GND Storefront`,
  });
}
export default async function Page() {
  return <Client />;
}
