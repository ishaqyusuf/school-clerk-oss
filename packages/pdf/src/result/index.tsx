import { ResultTemplate1 } from "./templates/template-1";
import type { ResultTemplateProps, ResultTemplateSlug } from "./types";

const resultTemplateRegistry: Record<
	ResultTemplateSlug,
	typeof ResultTemplate1
> = {
	"template-1": ResultTemplate1,
};

export function ResultTemplate({
	template = "template-1",
	...props
}: ResultTemplateProps) {
	const Template = resultTemplateRegistry[template];
	return <Template template={template} {...props} />;
}

export type {
	ResultTemplateCell,
	ResultTemplateColumn,
	ResultTemplateComment,
	ResultTemplateConfig,
	ResultTemplateGrade,
	ResultTemplateProps,
	ResultTemplateReport,
	ResultTemplateRow,
	ResultTemplateSlug,
	ResultTemplateStudent,
	ResultTemplateTable,
} from "./types";
export { resultTemplateSlugs } from "./types";
export { ResultTemplate1 };
