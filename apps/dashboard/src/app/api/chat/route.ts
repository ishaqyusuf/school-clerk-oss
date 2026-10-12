const retired = () =>
	Response.json({ error: "This assistant endpoint has been replaced. Open /assistant." }, { status: 410, headers: { "Cache-Control": "private, no-store" } },
		);
export const GET = retired;
export const POST = retired;
export const PATCH = retired;
