import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: Props) {
	const params = await searchParams;
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			for (const item of value) query.append(key, item);
		} else if (value != null) {
			query.set(key, String(value));
		}
	}
	redirect(`/students/list${query.size ? `?${query.toString()}` : ""}`);
}
