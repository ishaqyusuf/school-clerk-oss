import type { RouterOutputs } from "@/trpc/client";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    example?: string;
  }
  interface ColumnMeta<TData extends RowData, TValue> {
    preventDefault?: boolean;
    actionCell?: boolean;
    className?: string;
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
