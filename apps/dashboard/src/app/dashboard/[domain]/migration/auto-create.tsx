import { useEffect, useRef, useState } from "react";
import { Button } from "@school-clerk/ui/button";
import { sessionRecord } from "./data";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { importStudentAction } from "@/actions/import-student-action";
import { useMigrationStore } from "./store";
import { generateRandomString } from "@/utils/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function AutoCreate({
  data,
}: {
  data: ReturnType<typeof sessionRecord>;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const students = Object.values(data)
    .flat()
    .map((a) => a.students)
    .flat()
    .filter((a) => !a.paymentData?.storePayments?.studentId);

  const [failedNames, setFailedNames] = useLocalStorage<
    { name: string; className: string }[]
  >("failed-names", []);

  const t = useLoadingToast();
  const store = useMigrationStore();
  const isProcessing = useRef(false); // prevent multiple calls at once

  async function importStudent(index: number) {
    if (!isRunning || index >= students.length) {
      setIsRunning(false);
      document.title = "Migration";
      return;
    }
    // filter out failed students
    const filterStudents = students.filter(
      (s) =>
        !failedNames.some(
          (a) => a.name === s.fullName && a.className === s.classRoom,
        ),
    );

    const student = filterStudents[0];
    if (!student) return;

    const title = `Importing`;
    const description = `${student.fullName} | ${students.length} left`;
    t.loading(title, {
      description,
    });
    // update documeent tab title
    document.title = title;
    isProcessing.current = true;

    try {
      //   if (index == 0) {
      const r = await importStudentAction(student, null);
      store.update(
        `studentPayments.${student.classRoom}.${student.fullName}`,
        r.postData,
      );
      store.update("refreshToken", generateRandomString());
      //   } else await timeout(2000);
      t.success("Done");

      setTimeout(() => {
        isProcessing.current = false;
        setCurrentIndex((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.log(error);

      t.error("Failed", {
        description,
      });
      // isProcessing.current = false;
      // setIsRunning(false);
      setFailedNames((prev) => [
        ...prev,
        {
          name: student.fullName,
          className: student.classRoom,
        },
      ]);
      setTimeout(() => {
        isProcessing.current = false;
        setCurrentIndex((prev) => prev + 1);
      }, 1000);
    }
  }

  useEffect(() => {
    if (isRunning && !isProcessing.current) {
      importStudent(currentIndex);
    }
  }, [isRunning, currentIndex]);

  function toggleRun() {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setCurrentIndex(0);
      setIsRunning(true);
    }
  }

  return (
    <div className="fixed z-10 top-0 left-0 m-2">
      <Button onClick={toggleRun}>{isRunning ? "Stop" : "Start"}</Button>
    </div>
  );
}
