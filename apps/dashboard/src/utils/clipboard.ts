export async function copyTextToClipboard(text: string) {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fall through to the textarea fallback for browsers that expose the
			// Clipboard API but deny writes outside a focused/secure context.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.top = "0";
	document.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	try {
		return document.execCommand("copy");
	} finally {
		document.body.removeChild(textarea);
	}
}
