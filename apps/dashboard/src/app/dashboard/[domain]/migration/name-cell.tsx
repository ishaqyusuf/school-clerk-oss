export function NameCell({ student }) {
  return (
    <div className="flex">
      <div className="font-bold">{student.firstName}</div>
      <div className="px-2">{student.surname}</div>
      <div className="px-2 text-blue-500">{student.otherName}</div>
    </div>
  );
}
