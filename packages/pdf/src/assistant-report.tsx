import { existsSync } from "node:fs";
import { resolve } from "node:path";
let registered = false;
function ensureFont() {
	if (registered) return;
	const file = [
		"packages/pdf/public/fonts/Amiri-Regular.ttf",
		"../pdf/public/fonts/Amiri-Regular.ttf",
		"pdf/public/fonts/Amiri-Regular.ttf",
		"public/fonts/Amiri-Regular.ttf",
	]
		.map((p) => resolve(process.cwd(), p))
		.find(existsSync);
	if (!file) throw new Error("Assistant PDF font is unavailable.");
	Font.register({ family: "AssistantAmiri", src: file });
	registered = true;
}
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Font,
} from "@react-pdf/renderer";
const styles = StyleSheet.create({
	page: { padding: 40, fontSize: 10, fontFamily: "AssistantAmiri" },
	title: { fontSize: 20, marginBottom: 10 },
	note: { color: "#666666", marginBottom: 20 },
	entry: { marginBottom: 16 },
	role: { fontSize: 9, color: "#555555", marginBottom: 5 },
	body: { lineHeight: 1.5 },
});
export function AssistantReport({
	title,
	entries,
}: { title: string; entries: { role: string; text: string }[] }) {
	ensureFont();
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.note}>
					School Assistant recent conversation export (up to 100 messages). This
					is a conversation record, not an official payment receipt or academic
					certificate.
				</Text>
				{entries.map((entry, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: A PDF is an immutable render.
					<View key={index} style={styles.entry}>
						<Text style={styles.role}>{entry.role}</Text>
						<Text style={styles.body}>{entry.text}</Text>
					</View>
				))}
			</Page>
		</Document>
	);
}
