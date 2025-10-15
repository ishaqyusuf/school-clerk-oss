"use client";

import { createContextFactory } from "@/utils/context-factory";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@school-clerk/ui/cn";
import { ScrollArea } from "@school-clerk/ui/scroll-area";
import { Sheet, SheetContent, SheetContentProps } from "@school-clerk/ui/sheet";
import { useMediaQuery } from "react-responsive";
import Portal from "./portal";
import { Label } from "@school-clerk/ui/label";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "./icons";
import { screens } from "@/utils/responsive";

const sheetContentVariant = cva(
  "flex flex-col h-screen sh-[vh]  w-full overflow-x-hidden ",
  {
    variants: {
      floating: {
        // true: "md:h-[96vh] md:mx-4 md:mt-[2vh]",
        true: "",
        false: "",
      },
      rounded: {
        true: "md:rounded-xl",
        false: "",
      },
      size: {
        xl: "sm:max-w-xl",
        "2xl": "sm:max-w-5xl md:max-w-2xl",
        "3xl": "sm:max-w-5xl md:max-w-3xl",
        "4xl": "sm:max-w-5xl md:max-w-4xl",
        "5xl": "sm:max-w-5xl md:max-w-6xl",
        default: "",
        lg: "sm:max-w-lg",
      },
    },
    defaultVariants: {
      floating: false,
      rounded: false,
      size: "default",
    },
  }
);
interface Props
  extends SheetContentProps,
    VariantProps<typeof sheetContentVariant> {
  children?;
  open?: boolean;
  onOpenChange?;
  sheetName: string;
}
const { Provider: SheetProvider, useContext: useSheet } = createContextFactory(
  function (sheetName) {
    return {
      nodeId: ["csc", sheetName]?.filter(Boolean).join("-"),
      scrollContentId: ["cssc", sheetName]?.filter(Boolean).join("-"),
    };
  }
);
export function CustomSheet(props: Props) {
  return (
    <SheetProvider args={[props.sheetName]}>
      <CustomSheetBase {...props} />
    </SheetProvider>
  );
}
export function CustomSheetBase({
  children,
  open,
  onOpenChange,
  rounded,
  floating,
  sheetName,
  ...props
}: Props) {
  const sheet = useSheet();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={sheet.nodeId}
        {...props}
        className={cn(
          "p-2 px-4",
          sheetContentVariant({
            ...(props as any),
            floating,
            rounded,
          })
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
export function CustomSheetContentPortal({ children }) {
  // [`customSheetContent`,sheetId]
  const sheet = useSheet();
  // const isDesktop = useMediaQuery(screens.xl);
  // const nodeId = !isDesktop ? sheet.scrollContentId : sheet.nodeId;

  return (
    <>
      <Portal nodeId={sheet.nodeId} noDelay>
        {children}
      </Portal>
    </>
  );
}
export function CustomSheetContent({
  children = null,
  Header = null,
  className = "",
}) {
  const sheet = useSheet();
  return (
    <>
      {!Header || Header}
      <ScrollArea
        className={cn("-mx-4 flex-1  px-4", className, "flex flex-col")}
      >
        <div
          id={sheet.scrollContentId}
          className="flex flex-col gap-4 pb-36 sm:pb-16"
        >
          {children}
        </div>
      </ScrollArea>
    </>
  );
}
export function MultiSheetContent({
  children = null,
  Header = null,
  className = "",
  secondaryOpened = false,
}) {
  return (
    <div id="multi-sheet-content" className="flex flex-1 overflow-hidden">
      <div
        className={cn(
          "overflow-hidden flex flex-col flex-1",
          secondaryOpened && "pr-4"
        )}
      >
        {Header}
        {children}
      </div>
    </div>
  );
}
export function SecondarySheetContent({
  children = null,
  className = null,
  Header = null,
}) {
  return (
    <Portal nodeId={"multi-sheet-content"} noDelay>
      <CustomSheetContent Header={Header} className={cn("", className)}>
        {children}
      </CustomSheetContent>
    </Portal>
  );
}
export function SecondarySheetHeader({
  title = null,
  subtitle = null,
  ctx = null,
}) {
  return (
    <div className="fixed gap-4  top-0 flex px-2 mt-8">
      <div className="">
        <Button
          onClick={(e) => {
            if (ctx)
              ctx.setParams({
                secondaryTab: null,
              });
          }}
          size="xs"
          className="size-6 p-0"
          variant="secondary"
        >
          <Icons.arrowLeft className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-col">
        <Label className="text-lg">{title}</Label>
      </div>
    </div>
  );
}
