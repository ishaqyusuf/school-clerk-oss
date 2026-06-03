import type { RouterOutputs } from "@/trpc/client";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    example?: string;
  }
  interface ColumnMeta<TData extends RowData, TValue> {
    preventDefault?: boolean;
    actionCell?: boolean;
    className?: string;
    sticky?: boolean;
    sortField?: string;
    headerLabel?: string;
    skeleton?: {
      type:
        | "checkbox"
        | "text"
        | "avatar-text"
        | "icon-text"
        | "badge"
        | "tags"
        | "icon";
      width?: string;
    };
  }
}
// import "better-auth";
// declare module "better-auth" {
//   interface Session {
//     user: {
//       id: string;
//       email: string;
//       name?: string;
//       profileId?: string;
//       role?: string;
//     };
//   }
// }
