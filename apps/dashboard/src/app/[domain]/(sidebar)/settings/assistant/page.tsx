import { requireDashboardSchoolContext } from "@/lib/module-access";
import { AssistantSettingsPage } from "@/components/assistant/assistant-settings-page";
export const metadata = { title: "Assistant settings" };
export default async function Page() {
	await requireDashboardSchoolContext(["Admin"]);
	return <AssistantSettingsPage />;
}
