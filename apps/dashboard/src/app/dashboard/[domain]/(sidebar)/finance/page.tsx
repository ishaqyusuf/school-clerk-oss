import { getWalletDashboard } from "@/actions/get-wallet-dashboard";
import Client from "@/components/finance-dashboard/client";

export default async function Page({}) {
  const data = await getWalletDashboard();

  return (
    <div>
      <Client data={data} />
    </div>
  );
}
