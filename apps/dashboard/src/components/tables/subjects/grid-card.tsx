import { Item } from "@school-clerk/ui/composite";
import { Item as ColumnItem } from "./columns";

export function GridCard({ item, onClick }: { item: ColumnItem; onClick? }) {
  return (
    <Item
      onClick={(e) => onClick?.(item)}
      role="button"
      variant="outline"
      dir="rtl"
    >
      <Item.Content>
        <Item.Title>{item?.subject?.title}</Item.Title>
      </Item.Content>
    </Item>
  );
}
