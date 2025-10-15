import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Icon, IconKeys, Icons } from "./icons";
import { cn } from "../../utils";

import { VariantProps } from "class-variance-authority";
import { toast } from "../../components/use-toast";

import { Button, buttonVariants } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemProps,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";

import { ScrollArea } from "@school-clerk/ui/scroll-area";
import createContextFactory from "../../utils/context-factory";

type MenuItemProps = {
  link?;
  href?;
  Icon?;
  SubMenu?;
  shortCut?;
  _blank?: boolean;
  icon?: IconKeys;
} & DropdownMenuItemProps;
interface RowActionMoreMenuProps {
  children;
  disabled?: boolean;
  label?;
  Icon?;
  Trigger?;
  noSize?: boolean;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  hoverVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  open?;
  onOpenChanged?;
  className?: string;
  // dir?:  ComponentPropsWithoutRef<>
}
const { Provider, useContext: useDropdownMenu } = createContextFactory(
  () => {}
);
export { useDropdownMenu };
function BaseMenu(
  {
    children,
    Icon = Icons.Menu,
    label,
    disabled,
    Trigger,
    noSize,
    open,
    onOpenChanged,
    triggerSize,
    variant = "outline",
    hoverVariant,
    className,
  }: RowActionMoreMenuProps,
  ref
) {
  const [_open, _onOpenChanged] = useState(open);
  useImperativeHandle(ref, () => ({
    _onOpenChanged,
    async run(fn) {
      await fn();
    },
  }));
  const [hover, setHover] = useState(false);

  return (
    <DropdownMenu
      open={onOpenChanged ? open : _open}
      onOpenChange={onOpenChanged || _onOpenChanged}
    >
      <DropdownMenuTrigger
        onMouseEnter={(e) => {
          setHover(true);
        }}
        onMouseLeave={(e) => setHover(false)}
        asChild
      >
        {Trigger ? (
          Trigger
        ) : (
          <Button
            disabled={disabled}
            variant={open || hover ? hoverVariant || variant : variant}
            size={triggerSize}
            className={cn(
              "flex h-8 space-x-4",
              !label && "w-8 p-0",
              variant == "default"
                ? "data-[state=open]:bg-muted-foreground"
                : "data-[state=open]:bg-muted",
              triggerSize == "sm" && "h-6 w-6"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label && <span className="">{label}</span>}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(!noSize && "w-[185px]", className)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Item({
  link,
  href,
  children,
  Icon,
  SubMenu,
  onClick,
  _blank,
  icon,
  shortCut,
  className,
  ...props
}: MenuItemProps) {
  if (!Icon && icon) Icon = Icons[icon];
  if (SubMenu)
    return (
      <DropdownMenuSub {...props}>
        <DropdownMenuSubTrigger disabled={props.disabled}>
          {Icon && <Icon className="mr-2 size-4 text-muted-foreground/70" />}
          {children}
          {!!shortCut && (
            <>
              <div className="flex-1"></div>
              <DropdownMenuShortcut className="pl-4">
                {shortCut}
              </DropdownMenuShortcut>
            </>
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <ScrollArea className={cn("max-h-[50vh] overflow-auto", className)}>
            {SubMenu}
          </ScrollArea>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );

  const Frag = () => (
    <DropdownMenuItem
      {...props}
      onClick={link || href ? null : (onClick as any)}
      className={cn("gap-2", className)}
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />}
      {children}
      {!!shortCut && (
        <>
          <div className="flex-1"></div>
          <DropdownMenuShortcut className="pl-4">
            {shortCut}
          </DropdownMenuShortcut>
        </>
      )}
    </DropdownMenuItem>
  );

  return <Frag />;
}

interface TrashProps {
  action?;
  children?;
  loadingText?;
  successText?;
  errorText?;
  variant?: "trash" | "primary";
}
function Trash({ action, children, ...props }: TrashProps) {
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        if (!confirm) {
          setConfirm(true);
          setTimeout(() => {
            setConfirm(false);
          }, 3000);
          return;
        }
        setConfirm(false);
        startTransition(async () => {
          // toast.promise(
          //   async () => {
          //     if (action) {
          //       await action();
          //       // if (!noRefresh)
          //       router.refresh();
          //     }
          //     // revalidatePath("");
          //   },
          //   {
          //     loading: props.loadingText || `Deleting...`,
          //     success(data) {
          //       return props.successText || "Deleted Successfully";
          //     },
          //     error: props.errorText || "Unable to completed Delete Action",
          //   }
          // );
        });
      }}
      className={cn(
        (!props.variant || props.variant == "trash") &&
          "text-red-500 hover:text-red-600",
        props.variant == "primary" && "",
        "gap-2"
      )}
    >
      <Icon
        name={isPending ? "spinner" : confirm ? "warning" : "trash"}
        variant="destructive"
        className={cn(isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4", "")}
      />
      <span>{confirm ? "Sure?" : children}</span>
      <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}
export let Menu = Object.assign(forwardRef(BaseMenu), {
  Item,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Trash,
});
