import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import type { Item as DataItem } from "./columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";

import { Icons } from "@school-clerk/ui/custom/icons";
import { ArrowUpDown, MoreHorizontal, User } from "lucide-react";
import { useStudentParams } from "@/hooks/use-student-params";
import { useAuth } from "@/hooks/use-auth";
import { Item, Avatar } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";

export function StudentGridCard({ item: student }: { item: DataItem }) {
  const { setParams, ...params } = useStudentParams();
  const auth = useAuth();
  return (
    <Item variant="outline" dir="rtl">
      <Item.Media>
        <Avatar className="size-10">
          <Avatar.Image
            src={"/placeholder.svg"}
            // src={student.avatar || "/placeholder.svg"}
            alt={`${student.studentName}`}
          />
          <Avatar.Fallback>{getInitials(student.studentName)}</Avatar.Fallback>
        </Avatar>
      </Item.Media>
      <Item.Content>
        <Item.Title>{student.studentName}</Item.Title>
        <Item.Description>{student.department}</Item.Description>
      </Item.Content>
      <Item.Actions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {}}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {}}>
              Edit Student
            </DropdownMenuItem>
            <DropdownMenuItem>Contact Parents</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Item.Actions>
    </Item>
  );
  return (
    <Card dir="rtl" key={student.id} className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-12 w-12">
          <Avatar.Image
            src={"/placeholder.svg"}
            // src={student.avatar || "/placeholder.svg"}
            alt={`${student.studentName}`}
          />
          <Avatar.Fallback>
            <Icons.user className="h-6 w-6" />
          </Avatar.Fallback>
        </Avatar>
        <div className="grid gap-1">
          <CardTitle className="text-base">
            {/* {student.firstName} {student.lastName} */}
            {student.studentName}
          </CardTitle>
          <CardDescription>{student.department}</CardDescription>
        </div>
        <div className="flex-1"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {}}>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Student</DropdownMenuItem>
            <DropdownMenuItem>Contact Parents</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => {
              setParams({
                studentViewId: student.id,
                studentViewTermId: auth?.profile?.termId,
              });
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
