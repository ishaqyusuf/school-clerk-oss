import { Menu } from "@/components/menu";
import { StudentRecord } from "./data";
import { useMigrationStore } from "./store";

export function Actions({
  student,
  __updateStudent,
}: {
  __updateStudent;
  student: StudentRecord;
}) {
  const store = useMigrationStore();
  async function markAsFree(e) {
    const data = student?.paymentData?.storePayments;
    Object.entries(data?.billables).map(([a, b]) => {
      data.billables[a].free = true;
    });
    const studentName = student.fullName;
    __updateStudent(data);
  }
  return (
    <Menu triggerSize="xs">
      <Menu.Item onClick={markAsFree}>Free</Menu.Item>
    </Menu>
  );
}
