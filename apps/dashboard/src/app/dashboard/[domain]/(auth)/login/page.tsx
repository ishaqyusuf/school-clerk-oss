import { constructMetadata } from "@school-clerk/utils/construct-metadata";
import { Client } from "./client";

export async function generateMetadata() {
  return constructMetadata({
    title: `Login - GND Storefront`,
  });
}
export default async function Page() {
  return <>LOGIN</>;
  return <Client />;
}
