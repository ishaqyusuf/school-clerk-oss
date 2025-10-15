import { importStudentAction } from "@/actions/import-student-action";
import { Menu } from "@/components/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Button } from "@school-clerk/ui/button";
import { useTransition } from "react";
import { StudentRecord } from "./data";
import { AsyncFnType } from "@/types";
import { getClassRooms } from "@/actions/get-class-rooms";
import { useMigrationStore } from "./store";
import { generateRandomString } from "@/utils/utils";
import { createStudentAcademicProfile } from "@/actions/create-student-academic-profile";
import { setStudentClassroomAction, updateStudent } from "./server";
import { useAction } from "next-safe-action/hooks";
import { deleteStudent, deleteStudentAction } from "@/actions/delete-student";

export function ImportStudentAction({
  data,
  classRooms,
  fees,
}: {
  data: StudentRecord;
  classRooms: AsyncFnType<typeof getClassRooms>["data"];
  fees;
}) {
  const [loading, startTransition] = useTransition();
  const t = useLoadingToast();
  const store = useMigrationStore();
  const post = data?.paymentData?.storePayments;
  const classRoom = classRooms?.find((c) => c.id == post?.departmentId);
  async function importStudent(c?) {
    t.loading("Importing...");
    console.log(data);
    startTransition(async () => {
      try {
        const r = await importStudentAction(
          data,
          c
            ? {
                departmentId: c.id,
              }
            : null,
        );
        // console.log(r.postData);
        store.update(
          `studentPayments.${data.classRoom}.${data.fullName}`,
          r.postData,
        );
        store.update("refreshToken", generateRandomString());
        t.success("Done");
      } catch (error) {
        t.error("Failed");
      }
    });
  }
  const toast = useLoadingToast();
  const __deleteStudent = {
    execute: async ({ studentId }) => {
      toast.loading("Deleting...");
      await deleteStudent({
        studentId,
      });
      let post = data.paymentData?.storePayments;
      if (!post) post = {} as any;
      const { postId, studentId: stdId, departmentId, ...postData } = post;

      // postData.studentId = null
      updateStudent(postId, data.classRoom, data.fullName, postData).then(
        (e) => {
          store.update(
            `studentPayments.${data.classRoom}.${data.fullName}`,
            postData,
          );
          toast.success("Deleted!", {
            variant: "destructive",
          });
          store.update("refreshToken", generateRandomString());
        },
      );
    },
  };
  async function setStudentProfile(departmentId, feeId?) {
    try {
      t.loading("Updating...");
      const response = await setStudentClassroomAction(
        data,
        departmentId,
        post?.departmentId,
        feeId,
      );
      store.update(
        `studentPayments.${data.classRoom}.${data.fullName}`,
        response.postData,
      );
      store.update("refreshToken", generateRandomString());
      t.success("Done");
    } catch (error) {
      t.error("Failed");
    }
  }
  return (
    <div className="flex">
      <Menu
        variant={post?.studentId ? "destructive" : "default"}
        disabled={loading}
        Icon={null}
        label={
          classRoom
            ? classRoom?.departmentName
            : post?.studentId
              ? "Set Class"
              : "Create"
        }
      >
        <Menu.Item
          onClick={(e) => {
            if (post?.studentId)
              __deleteStudent.execute({
                studentId: post?.studentId,
              });
            else importStudent();
          }}
        >
          {post?.studentId ? "Delete Student" : "Create Student"}
        </Menu.Item>
        {classRooms?.map((c) => (
          <Menu.Item
            disabled={!post?.studentId}
            // onClick={(e) => importStudent(c)}
            key={c.id}
            SubMenu={
              <>
                <Menu.Item
                  onClick={(e) => {
                    setStudentProfile(c.id);
                  }}
                >
                  No Fee
                </Menu.Item>
                {fees?.map((fee) => (
                  <Menu.Item
                    onClick={(e) => {
                      console.log(fee);
                      setStudentProfile(c.id, fee?.historyId);
                    }}
                  >
                    {fee?.title} {" - "} {fee?.amount}
                  </Menu.Item>
                ))}
              </>
            }
          >
            {c.departmentName}
          </Menu.Item>
        ))}
      </Menu>
      {/* <Button
        disabled={loading}
        variant={post?.studentId ? "destructive" : "default"}
        size="xs"
        onClick={(e) => {
          if (post?.studentId) deleteStudent();
          else importStudent();
        }}
      >
        <span className="whitespace-nowrap">
          {post?.studentId ? "Delete" : "Create"}
        </span>
      </Button> */}
    </div>
  );
}
