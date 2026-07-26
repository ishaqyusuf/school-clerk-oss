import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { ColumnDef } from "@tanstack/react-table";

export type SubjectCatalogItem =
  RouterOutputs["subjects"]["getSubjectCatalog"]["data"][number];

export const catalogColumns: ColumnDef<SubjectCatalogItem>[] = [
  {
    accessorKey: "title",
    header: "Subject",
    cell: ({ row }) => <span dir="auto">{row.original.title}</span>,
  },
  {
    accessorKey: "classroomCount",
    header: "Classes",
    cell: ({ row }) => <span>{row.original.classroomCount}</span>,
  },
];

export const catalogMobileColumn: ColumnDef<SubjectCatalogItem>[] = [
  {
    accessorKey: "mobile",
    header: "",
    meta: {
      className: "flex-1 p-0",
    },
    cell: ({ row }) => <SubjectCatalogMobileCard item={row.original} />,
  },
];

export function SubjectCatalogMobileCard({
  item,
}: {
  item: SubjectCatalogItem;
}) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <span className="font-semibold text-foreground" dir="auto">
        {item.title}
      </span>
      <span className="text-sm text-muted-foreground" dir="ltr">
        <span className="font-medium text-foreground">
          {item.classroomCount}
        </span>{" "}
        {item.classroomCount === 1 ? "class" : "classes"}
      </span>
    </div>
  );
}
