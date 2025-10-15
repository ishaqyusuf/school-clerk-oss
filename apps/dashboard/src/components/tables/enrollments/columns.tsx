import { ColumnDef } from "@/types";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Data = RouterOutputs["enrollments"]["index"]["data"][number];
export const columns: ColumnDef<Data>[] = [
  {
    header: "Title",
    accessorKey: "title",
    cell: ({ row: { original: item } }) => (
      <div>
        <div>
          <>{item.fullName}</>
        </div>
      </div>
    ),
  },
  {
    header: "History",
    accessorKey: "history",
    cell: ({ row: { original: item } }) => (
      <div className="flex gap-4">
        {item.termHistory.map((term) => (
          <div key={term.id}>
            <div>{term.title}</div>
            <div>{term.classRoom}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    header: "Current",
    accessorKey: "current",
    cell: ({ row: { original: item } }) => (
      <div className="flex gap-4">
        {item.currentTerm ? (
          <div>
            <div>{item.currentTerm.title}</div>
            <div>{item.currentTerm.classRoom}</div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
    ),
  },
];
