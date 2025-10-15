import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { _uuidRel, timeStamps } from "./schema-helper";
import { School } from "./school-schema";

// export const Post = pgTable("post", {
//   id: uuid("id").notNull().primaryKey().defaultRandom(),
//   title: varchar("name", { length: 256 }).notNull(),
//   content: text("content").notNull(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updatedAt", {
//     mode: "date",
//     withTimezone: true,
//   }).$onUpdateFn(() => sql`now()`),
// });

// export const CreatePostSchema = createInsertSchema(Post, {
//   title: z.string().max(256),
//   content: z.string().max(256),
// }).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });
type UserRole = "admin" | "accountant" | "teacher";
export const User = pgTable(
  "user",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }),
    phoneNo: varchar("phone_no", { length: 255 }),
    role: varchar("role", { length: 255 }).$type<UserRole>(),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    emailVerified: timestamp("emailVerified", {
      mode: "date",
      withTimezone: true,
    }),
    image: varchar("image", { length: 255 }),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.email, t.schoolId),
  }),
);

export const Account = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<"email" | "oauth" | "oidc" | "webauthn">()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: varchar("refresh_token", { length: 255 }),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const Session = pgTable("session", {
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  expires: timestamp("expires", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
});
