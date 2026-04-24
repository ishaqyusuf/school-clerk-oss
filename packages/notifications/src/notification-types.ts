import type { z } from "zod";
import type { NotificationContactKind } from "./contacts";
import type {
	NotificationActionDescriptor,
	NotificationChannel,
	NotificationDispatch,
	NotificationInput,
	NotificationVariant,
} from "./core-types";

type Resolvable<TValue, TPayload> =
	| TValue
	| ((payload: TPayload) => TValue | null | undefined)
	| null
	| undefined;

type BuiltNotificationInput = NotificationInput;

export type NotificationTypeDefinition<
	TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = {
	defaultChannels?: NotificationChannel[];
	defaultAction?: Resolvable<NotificationActionDescriptor, z.infer<TSchema>>;
	defaultRecipients?: NotificationContactKind[];
	description?: Resolvable<string, z.infer<TSchema>>;
	schema: TSchema;
	title?: Resolvable<string, z.infer<TSchema>>;
	variant?: Resolvable<NotificationVariant, z.infer<TSchema>>;
};

export type NotificationTypeRegistry = Record<string, NotificationTypeDefinition>;

function resolveValue<TValue, TPayload>(
	value: Resolvable<TValue, TPayload>,
	payload: TPayload,
) {
	if (typeof value === "function") {
		return (value as (payload: TPayload) => TValue | null | undefined)(payload);
	}

	return value;
}

export function defineNotificationType<TSchema extends z.ZodTypeAny>(
	definition: NotificationTypeDefinition<TSchema>,
) {
	return definition;
}

export function defineNotificationTypes<
	TRegistry extends NotificationTypeRegistry,
>(registry: TRegistry) {
	return registry;
}

export function createNotificationInputFromType<
	TRegistry extends NotificationTypeRegistry,
	TType extends keyof TRegistry & string,
>(
	registry: TRegistry,
	notificationType: TType,
	payload: z.infer<TRegistry[TType]["schema"]>,
	input?: Omit<
		NotificationInput,
		"description" | "notificationType" | "title" | "variant"
	> & {
		description?: string;
		title?: string;
		variant?: NotificationVariant;
	},
): BuiltNotificationInput {
	const definition = registry[notificationType];

	if (!definition) {
		throw new Error(`Unknown notification type: ${notificationType}`);
	}

	const parsed = definition.schema.parse(payload);

	return {
		...input,
		action:
			input?.action ??
			resolveValue(definition.defaultAction, parsed) ??
			undefined,
		channels: input?.channels ?? definition.defaultChannels ?? ["in_app"],
		description:
			input?.description ??
			resolveValue(definition.description, parsed) ??
			undefined,
		notificationType,
		title:
			input?.title ?? resolveValue(definition.title, parsed) ?? "Notification",
		variant:
			input?.variant ?? resolveValue(definition.variant, parsed) ?? "info",
	};
}

export function createNotificationDispatchFromType<
	TRegistry extends NotificationTypeRegistry,
	TType extends keyof TRegistry & string,
>(
	registry: TRegistry,
	notificationType: TType,
	payload: z.infer<TRegistry[TType]["schema"]>,
	input?: Omit<
		NotificationDispatch,
		| "channels"
		| "description"
		| "notificationType"
		| "payload"
		| "recipients"
		| "title"
		| "variant"
	> & {
		channels?: NotificationChannel[];
		description?: string;
		recipients?: NotificationDispatch["recipients"];
		title?: string;
		variant?: NotificationVariant;
	},
): NotificationDispatch {
	const built = createNotificationInputFromType(
		registry,
		notificationType,
		payload,
		input,
	);

	return {
		...built,
		channels: built.channels ?? ["in_app"],
		payload,
		recipients: input?.recipients ?? [],
	};
}
