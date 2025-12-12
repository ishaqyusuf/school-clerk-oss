import type { TRPCContext } from "@api/trpc/init";
import { enToAr, generateRandomString, sum } from "@school-clerk/utils";
// const postCode = `firstTerm-1446-1447`;
const postCode = `firstTerm-1446-1447-prod`;
const raws = {
  stacks: [] as any[],
  stackObj: {
    scoreLines: {},
  } as any,
};
async function clear(ctx: TRPCContext) {
  await ctx.db.posts.deleteMany({
    where: {
      name: postCode,
    },
  });
}
export async function generateFirstTermData(ctx: TRPCContext, payload: Data[]) {
  //   await clear(ctx);
  const assessmentsList: Partial<StudentSubjectAssessment>[] = [];
  try {
    await ctx.db.$transaction(
      async (db) => {
        const _ctx = { db };
        // for (const item of payload) {
        for (let ci = 0; ci < payload.length; ci++) {
          const item = payload[ci]!;
          const classRoom = await getClassroom(_ctx, item.course);
          if (!classRoom?.postId) {
            raws.stacks.push({ classRoom });
            throw new Error("CLASS ROOM POST ID NOT FOUND");
          }
          const subjects = await getSubjects(_ctx);
          for (let si = 0; si < item.subjects.length; si++) {
            const subjectData = item.subjects[si];
            let subject;
            try {
              subject = subjects.find(
                (s) =>
                  // s.title?.localeCompare(subjectData?.subject!)
                  s.title === subjectData?.subject!
              );
            } catch (error) {
              raws.stacks.push({
                subjects,
                error,
              });
              throw new Error("SUBJECT LOCALE COMPARE FAILED");
            }
            if (!(subject?.postId > 0))
              subject = await createSubject(_ctx, subjectData?.subject!);
            if (!subject?.postId) {
              raws.stacks.push({
                subject,
                subjectData,
              });
              throw new Error("");
            }
            const classSubject = await createClassSubject(
              _ctx,
              classRoom?.postId,
              subject.postId
            );
            payload[ci]!.subjects[si]!.id = classSubject.postId;
            const subjectId = payload[ci]!.subjects[si]!.id;
            raws.stacks.push({
              subjectId,
              classSubject,
            });
            if (!subjectId) {
              throw new Error("unable to set subject id");
            }
            for (let ai = 0; ai < subjectData?.assessments.length!; ai++) {
              const assessmentData = subjectData?.assessments[ai];
              const classSubjectAssessment =
                await createClassroomSubjectAssessment(_ctx, {
                  classId: classRoom?.postId,
                  classSubjectId: classSubject.postId,
                  title: assessmentData?.type,
                  obtainable: assessmentData?.obtainable!,
                  index: ai,
                });
              payload[ci]!.subjects[si]!.assessments[ai]!.id =
                classSubjectAssessment.postId;
            }
          }
          for (let sti = 0; sti < item.students.length; sti++) {
            // if (sti == 2) throw new Error("BREAK");
            const studentData = item.students[sti];
            const {
              assessments,
              firstName,
              gender,
              otherName,
              rawData,
              surname,
            } = studentData!;
            const student = await createStudent(_ctx, {
              classId: classRoom?.postId,
              firstName,
              surname,
              otherName,
              gender,
            });
            payload[ci]!.students[sti]!.id = student.postId;
            assessments.map((assessment) => {
              const subject = payload[ci]!.subjects?.find(
                (a) =>
                  // a.code?.localeCompare(assessment.subjectCode)
                  a.code === assessment.subjectCode
              );
              const subjectAssessmentId = subject?.assessments?.find(
                (_) => _.code === assessment.assessmentCode
              )?.id!;
              if (!subjectAssessmentId) {
                raws.stacks.push({
                  error: "Assessment id not found",
                  stack: [payload[ci]!.subjects, assessment],
                });
                throw new Error("Assessment Id not found");
              }
              raws.stackObj.scoreLines[
                `${studentData?.firstName}--${assessment.subjectCode}--${subject.subject}`
              ] = assessment.score;
              assessmentsList.push({
                markObtained: assessment.score,
                studentId: student.postId,
                subjectAssessmentId,
                calculatedScore: assessment.score!,
                classId: classRoom?.postId,
                classSubjectId: subject.id!,
                type: "student-subject-assessment",
              });
            });
          }
        }

        await db.posts.createMany({
          data: assessmentsList.map((data) => ({
            name: postCode,
            data,
          })),
        });
        // throw new Error("FAILED");
      },
      {
        timeout: 60000,
      }
    );
  } catch (error) {
    raws.stackObj.error = { error };
  }

  return {
    raws,
    assessmentsList,
    payload,
  };
}
async function getClassroom(ctx, classTitle) {
  const db: TRPCContext["db"] = ctx.db;
  const course = await getData<ClassPostData>(ctx, [
    pathEquals("classTitle", classTitle),
    pathEquals("type", "class" as PostTypes),
  ]);

  if (course?.postId) return course;
  const data = {
    courseCode: generateRandomString(5),
    classTitle,
    type: "class",
  } as Partial<ClassPostData>;
  const classRoom = await createPost<ClassPostData>(ctx, data);
  if (classRoom) return classRoom;
}
export async function getPaymentsList(ctx: TRPCContext) {
  const payments = await getDataList<PaymentRaw>(
    ctx,
    pathEquals("type", "raw-payment" as PostTypes)
  );
  const studentPayments = await getDataList<Payment>(
    ctx,
    pathEquals("type", "student-payment" as PostTypes)
  );

  return {
    payments: payments.map((payment) => ({
      ...payment,
      appliedPayments: studentPayments.filter(
        (a) => a.rawPaymentId === payment?.postId
      ),
    })),
  };
}
export async function findStudents(ctx: TRPCContext, searchParts: string[]) {
  const students = await getDataList<Student>(ctx, [
    pathEquals("type", "student" as PostTypes),
    {
      OR: [
        ...searchParts
          .map((search) => [
            pathEquals("firstName" as keyof Student, search),
            pathEquals("surname" as keyof Student, search),
          ])
          .flat(),
      ],
    },
  ]);
  const classrooms = await getClassrooms(ctx);
  return {
    // students: students.map((s) => ({
    //   studentId: s.postId,
    //   fullName: [s.firstName, s.surname, s.otherName].filter(Boolean).join(" "),
    //   classId: s.classId,
    //   classRoom: classrooms.find((c) => c.postId === s.classId)?.classTitle,
    // })),
    students: findBestMatches(students, searchParts, classrooms),
    classrooms,
  };
}
function findBestMatches(students, searchParts, classrooms) {
  const scoredStudents = students.map((s) => {
    const nameParts = [s.firstName, s.surname, s.otherName].filter(Boolean);
    const totalParts = searchParts.length;
    const matchedParts = searchParts.filter((sp) =>
      nameParts.some((np) => np.toLowerCase() === sp.toLowerCase())
    ).length;
    const percentage =
      totalParts === 0
        ? 0
        : Math.round((matchedParts / totalParts) * 100) || 50;
    return {
      studentId: s.postId,
      fullName: nameParts.join(" "),
      classId: s.classId,
      classRoom: classrooms.find((c) => c.postId === s.classId)?.classTitle,
      percentage,
    };
  });

  const perfectMatches = scoredStudents.filter((s) => s.percentage === 100);

  const resultStudents =
    perfectMatches.length > 0
      ? perfectMatches
      : scoredStudents.sort((a, b) => b.percentage - a.percentage).slice(0, 2);
  return resultStudents;
}
export async function getSubjects(ctx) {
  const subjects = await getDataList<SubjectPostData>(
    ctx,
    pathEquals("type", "subject" as PostTypes)
  );
  return subjects;
}
async function createSubject(ctx, title) {
  const data: Partial<SubjectPostData> = {
    type: "subject",
    title,
    code: generateRandomString(4),
  };
  const subject = await createPost<SubjectPostData>(ctx, data);
  return subject;
}
async function createClassSubject(ctx, classId, subjectId) {
  const db: TRPCContext["db"] = ctx.db;
  const data: Partial<ClassSubject> = {
    type: "class-subject",
    classId,
    subjectId,
  };
  const r = await db.posts.create({
    data: {
      name: postCode,
      data,
    },
  });
  return transformData<ClassSubject>(r);
}
const pathEquals = (path, equals) => ({
  data: {
    path: [path],
    equals,
  },
});
const pathGt = (path, gt) => ({
  data: {
    path: [path],
    gt,
  },
});

export async function createPost<T>({ db }, data) {
  const post = await db.posts.create({
    data: {
      name: postCode,
      data: data as any,
    },
  });
  return transformData<T>(post);
}
export async function updateStudentAssessment(ctx: TRPCContext, input) {
  const { calculatedScore, subjectAssessmentId, studentId, markObtained } =
    input.meta as StudentSubjectAssessment;
  const p = await getData<StudentSubjectAssessment>(ctx, [
    pathEquals(
      "subjectAssessmentId" as keyof StudentSubjectAssessment,
      subjectAssessmentId
    ),
    pathEquals("studentId" as keyof StudentSubjectAssessment, studentId),
  ]);
  if (p?.postId) {
    const { postId, ...rest } = p;
    rest.markObtained = markObtained;
    rest.calculatedScore = calculatedScore;
    const result = await updatePost<StudentSubjectAssessment>(ctx, p.postId, {
      ...rest,
      type: "student-subject-assessment",
    });
    return result;
  } else {
    const result = await createPost<StudentSubjectAssessment>(ctx, {
      ...input.meta,
      type: "student-subject-assessment",
    } as StudentSubjectAssessment);
    return result;
  }
}
export async function updatePost<T>({ db }, id, data) {
  const postData = (await getData<T>({ db }, [
    {
      id,
    },
  ])) as any;
  const { postId, ...oldPostData } = postData || {};
  const post = await db.posts.update({
    where: { id },
    data: {
      data: {
        ...oldPostData,
        ...data,
      } as any,
    },
  });
  return transformData<T>(post);
}
async function getData<T>(ctx, dataQuery?, postId?) {
  const db: TRPCContext["db"] = ctx.db;
  const where: any[] = [
    {
      name: postCode,
    },
    // ...(Array.isArray(dataQuery) ? dataQuery : []),
  ];
  if (Array.isArray(dataQuery)) where.push(...dataQuery);
  else where.push(dataQuery);
  if (postId) where.push({ id: postId });
  const post = await db.posts.findFirst({
    where: {
      AND: where,
      //   id: postId || undefined,
      //   name: postCode,
      //   data: Array.isArray(dataQuery) ? undefined : dataQuery || undefined,
      //   AND: Array.isArray(dataQuery)
      //     ? dataQuery.map((q) => ({
      //         data: q,
      //       }))
      //     : undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!post) return null;
  return {
    ...(post?.data as any),
    postId: post?.id,
  } as T;
}
async function getDataList<T>(ctx, dataQuery) {
  const db: TRPCContext["db"] = ctx.db;
  const where = [
    {
      name: postCode,
    },
    // ...(Array.isArray(dataQuery) ? dataQuery : []),
  ];
  if (Array.isArray(dataQuery)) where.push(...dataQuery);
  else where.push(dataQuery);
  const ls = await db.posts.findMany({
    where: {
      AND: where,
      //     AND: ,
      //   data: Array.isArray(dataQuery) ? undefined : dataQuery,
      //   AND: Array.isArray(dataQuery)
      //     ? dataQuery.map((q) => ({
      //         data: q,
      //       }))
      //     : undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return ls.map(
    ({ id: postId, data }) =>
      ({
        postId,
        ...(data as any),
      } as T)
  );
}

async function createClassroomSubjectAssessment(
  ctx,
  data: Partial<ClassSubjectAssessment>
) {
  data.type = "class-subject-assessment";
  return await createPost<ClassSubjectAssessment>(ctx, data);
}
async function createStudent(ctx, data: Partial<Student>) {
  const db: TRPCContext["db"] = ctx.db;
  data.type = "student";
  const r = await db.posts.create({
    data: {
      name: postCode,
      data,
    },
  });
  return transformData<Student>(r);
}
function transformData<T>(data) {
  const dataResponse = {
    ...data.data,
    postId: data.id,
  } as T;
  const type = data.data?.type;
  if (type) {
    if (!raws.stackObj[type]) {
      raws.stackObj[type] = [dataResponse];
    } else raws.stackObj[type].push(dataResponse);
  } else raws.stacks.push(dataResponse);
  return dataResponse;
}
async function createStudentSubjectAssessment(
  ctx,
  data: Partial<StudentSubjectAssessment>
) {
  const db: TRPCContext["db"] = ctx.db;
  data.type = "student-subject-assessment";
  const r = await db.posts.create({
    data: {
      name: postCode,
      data,
    },
  });
  return transformData<StudentSubjectAssessment>(r);
}
export async function getStudentAssessments(ctx: TRPCContext, args) {
  const { studentId, subjectAssessments } = args;
  const assessments = await getDataList<StudentSubjectAssessment>(ctx, [
    pathEquals("type", "student-subject-assessment" as PostTypes),
    pathEquals("studentId" as keyof StudentSubjectAssessment, studentId),
  ]);
  //   const subjectAssessments = await getDaa
  return assessments.map((studentAssessment) => {
    const subjectAssessment = (
      subjectAssessments as ClassSubjectAssessment[]
    )?.find((a) => a.postId === studentAssessment.subjectAssessmentId);
    return {
      studentAssessment,
      subjectAssessment,
    };
  });
}
export async function getClassroomStudentList(ctx: TRPCContext, classId) {
  const classSubjects = await getClassroomSubjects(ctx, classId);
  const students = await getDataList<Student>(ctx, [
    pathEquals("type", "student" as PostTypes),
    pathEquals("classId" as keyof Student, classId),
  ]);
  const assessments = await getDataList<StudentSubjectAssessment>(ctx, [
    pathEquals("type", "student-subject-assessment" as PostTypes),
  ]);

  type T = ClassSubjectAssessment;
  const paymentList = await getDataList<Payment>(ctx, [
    pathEquals("type", "student-payment" as PostTypes),
    pathEquals("classId" as keyof Payment, classId),
  ]);
  return {
    assessments,
    classSubjects,
    students: students.map((student) => {
      const payments = paymentList.filter(
        (p) => p.studentId === student.postId
      );
      return {
        ...student,
        payments,
      };
    }),
  };
}
export async function getClassroomStudents(ctx: TRPCContext, classId) {
  const classSubjects = await getClassroomSubjects(ctx, classId);
  const students = await getDataList<Student>(ctx, [
    pathEquals("type", "student" as PostTypes),
    pathEquals("classId" as keyof Student, classId),
  ]);
  const assessments = await getDataList<StudentSubjectAssessment>(ctx, [
    pathEquals("type", "student-subject-assessment" as PostTypes),
    pathEquals("classId" as keyof StudentSubjectAssessment, classId),
  ]);

  return {
    assessments,
    classSubjects,
    students: students.map((student) => {
      const subjectAssessments = classSubjects.classroomSubjects.map((cs) => ({
        classroomSubjectId: cs.postId,
        classId: cs.classId,
        assessments: cs.assessments.map((csa) => ({
          subjectAssessment: csa,
          studentAssessment: assessments.find(
            (a) =>
              a.classSubjectId == cs.postId &&
              a.subjectAssessmentId === csa.postId &&
              a.studentId === student.postId
          ),
        })),
      }));
      const totalObtainable = sum(
        subjectAssessments.flatMap((sa) =>
          sa.assessments
            .filter((a) => a.subjectAssessment.assessmentType == "primary")
            .map((ass) => ass.subjectAssessment?.obtainable || 0)
        )
      );
      const totalScore = sum(
        subjectAssessments.flatMap((sa) =>
          sa.assessments
            .filter((a) => a.subjectAssessment.assessmentType == "primary")
            .map(
              (ass) =>
                ass.studentAssessment?.calculatedScore ||
                ass.studentAssessment?.markObtained ||
                0
            )
        )
      );
      const percentageScore = Math.round((totalScore / totalObtainable) * 100);
      return {
        ...student,
        subjectAssessments,
        totalScore,
        totalObtainable,
        percentageScore,
        comment: getResultComment(percentageScore),
      };
    }),
  };
}
export async function getClassroomSubjects(ctx: TRPCContext, classId) {
  const classroomSubjects = await getDataList<ClassSubject>(ctx, [
    pathEquals("type", "class-subject" as PostTypes),
    pathEquals("classId" as keyof ClassSubject, classId),
  ]);
  //   const subjects = await getDataList<SubjectPostData>(ctx, [
  //     pathEquals("type", "subject" as PostTypes),
  //     {
  //       id: {
  //         in: classroomSubjects.map((s) => s.subjectId),
  //       },
  //     },
  //   ]);
  const subjects = await getSubjects(ctx);
  type T = ClassSubjectAssessment;
  const assessments = await getDataList<T>(ctx, [
    pathEquals("type", "class-subject-assessment" as PostTypes),
    {
      OR: [
        ...classroomSubjects.map((s) =>
          pathEquals("classSubjectId" as keyof T, s.postId)
        ),
      ],
    },
  ]);
  return {
    classroomSubjects: classroomSubjects.map((s) => ({
      ...s,
      title: subjects?.find((a) => a.postId === s.subjectId)?.title,
      assessments: assessments
        .filter((a) => a.classSubjectId == s.postId)
        .sort((a, b) => a.index - b.index),
    })),
    subjects,
  };
}
export async function getUniqueueAssessmentList(ctx: TRPCContext) {
  const list = await getDataList<ClassSubjectAssessment>(
    ctx,
    pathEquals("type", "class-subject-assessment" as PostTypes)
  );
  const resp = list.map((l) => {
    const { title, assessmentType, obtainable, index } = l;

    const slug = [title, assessmentType, obtainable].join("-");
    return {
      slug,
      data: { title, assessmentType, obtainable, index },
    };
  });

  return resp.filter((a, i) => i === resp.findIndex((b) => b.slug === a.slug));
}
export async function getClassrooms(ctx: TRPCContext) {
  const classrooms = await getDataList<ClassPostData>(
    ctx,
    pathEquals("type", "class" as PostTypes)
  );
  return classrooms.sort((a, b) => a.classIndex! - b.classIndex!);
}
export async function getClassroomPrintData(
  ctx: TRPCContext,
  classroomId: number
) {
  const classroomData = await getClassroomStudents(ctx, classroomId);
  const ids = classroomData.students.map((s) => s.postId);
  const printData = await getStudentsPrintdata(ctx, ids);
  return {
    classroomData,
    ids,
    printDataObjectByStudentId: Object.fromEntries(
      printData.map((p) => [String(p.student.postId), p])
    ),
  };
}
export async function getStudentsPrintdata(
  ctx: TRPCContext,
  studentIds: number[]
) {
  const studentIdsArray = studentIds
    .filter((a) => a > 0)
    .map((id) => ({
      id,
    }));
  if (!studentIdsArray.length)
    throw new Error(
      `student ids not found: ${JSON.stringify({
        studentIds,
        studentIdsArray,
      })}`
    );
  const students = await getDataList<Student>(ctx, [
    pathEquals("type", "student" as PostTypes),
    {
      OR: studentIdsArray,
    },
  ]);
  if (!students?.length)
    throw new Error(`Students not found ${JSON.stringify(studentIds)}`);
  const classList = await getDataList<ClassPostData>(ctx, [
    pathEquals("type", "class" as PostTypes),
    {
      OR: Array.from(new Set(students.map((a) => a.classId))).map((id) => ({
        id,
      })),
    },
  ]);
  const response = await Promise.all(
    classList
      .map(async (classroom) => {
        const classAssessments = await getDataList<StudentSubjectAssessment>(
          ctx,
          [
            pathEquals("type", "student-subject-assessment" as PostTypes),
            pathEquals(
              "classId" as keyof ClassSubjectAssessment,
              classroom.postId
            ),
          ]
        );
        const classSubjects = await getClassroomSubjects(ctx, classroom.postId);
        return students
          .filter((s) => s.classId === classroom.postId)
          .map((student) => {
            const subjectList = classSubjects.classroomSubjects.map((a) => {
              const assessments = a.assessments.map((_as) => {
                const _assessment = classAssessments.find(
                  (cas) =>
                    cas.studentId === student.postId &&
                    cas.subjectAssessmentId === _as.postId
                );
                return {
                  obtainable: _as.obtainable,
                  obtained:
                    _assessment?.calculatedScore || _assessment?.markObtained,
                  label: _as.title,
                  index: _as.index,
                  assessmentType: _as.assessmentType,
                };
              });
              return {
                title: a.title,
                assessments,
                index: a.index,
              };
            });
            const tables: {
              [tk in string]: {
                columns: {
                  label?: string;
                  subLabel?: string;
                }[];
                rows: {
                  columns: {
                    value?;
                    // style?: '
                  }[];
                }[];
              };
            } = {};
            subjectList.map((subject, si) => {
              const assessmentCode = subject.assessments
                .map((a) => {
                  a.label;
                })
                .join("-");
              if (!tables[assessmentCode])
                tables[assessmentCode] = {
                  columns: [
                    {
                      label: `المواد`,
                    },
                    ...subject.assessments
                      ?.filter((a) => a.assessmentType == "primary")
                      .map((a) => ({
                        label: a.label,
                        subLabel: `(${
                          a.obtainable ? enToAr(a.obtainable) : "-"
                        })`,
                      })),
                    {
                      label: `المجموع الكلي`,
                      subLabel: `(${enToAr(100)})`,
                    },
                  ],
                  rows: [],
                };
              tables[assessmentCode].rows.push({
                columns: [
                  {
                    value: `${enToAr(si + 1)}. ${subject.title}`,
                  },
                  ...subject.assessments
                    .filter((a) => a.assessmentType == "primary")
                    .map((a) => ({
                      value: a.obtained,
                    })),
                  {
                    value: sum(
                      subject.assessments
                        .filter((a) => a.assessmentType == "primary")
                        .map((a) => a.obtained)
                    ),
                  },
                ],
              });
            });
            const rowsCount = sum(
              Object.values(tables).map((a) => 1 + a.rows.length)
            );
            return {
              tables: Object.values(tables),
              lineCount: rowsCount,
              grade: {
                obtained: 0,
                obtainable: 0,
                totalStudents: 0,
                position: 0,
              },
              subjectList,
              student,
              classroom: { title: classroom.classTitle },
            };
          });
      })
      .flat()
  );
  return response.flat();
}
async function getStudentAssessmentForm(ctx: TRPCContext, studentId) {
  const student = await getData<Student>(ctx, null, studentId);
  const assessments = await getDataList<StudentSubjectAssessment>(ctx, [
    pathEquals("type", "student-subject-assessment" as PostTypes),
    pathEquals("studentId", studentId),
  ]);
  const classSubjectAssessments = await getDataList<ClassSubjectAssessment>(
    ctx,
    [
      pathEquals("type", "class-subject" as PostTypes),
      pathEquals("classId", student?.classId),
    ]
  );
  const classSubjects = await getDataList<ClassSubject>(ctx, [
    pathEquals("type", "class-subject" as PostTypes),
    pathEquals("classId", student?.classId),
  ]);
}
export type PostTypes = BasePostData["type"];
export interface StudentSubjectAssessment extends BasePostData {
  studentId: number;
  subjectAssessmentId: number;
  classSubjectId: number;
  classId: number;
  markObtained: number;
  calculatedScore: number;
}
export interface Student extends BasePostData {
  firstName;
  otherName;
  surname;
  classId;
  gender;
}
export interface PaymentRaw extends BasePostData {
  line?: string;
}
export interface Payment extends BasePostData {
  amount: number;
  summary?: string;
  term: "first" | "second" | "third";
  paymentType?: "fee" | "form" | "service" | "service-payout";
  studentId?: number;
  staffId?: number;
  classId?: number;
  rawPaymentId?: number;
  status: "applied" | "pending" | "paid";
}
export interface ClassSubjectAssessment extends BasePostData {
  classSubjectId;
  classId;
  title;
  obtainable;
  assessmentTotal?;
  index;
  assessmentType: "primary" | "secondary";
}
export interface ClassSubject extends BasePostData {
  classId;
  subjectId;
  index;
}
export interface BasePostData {
  type:
    | "subject"
    | "class"
    | "class-subject"
    | "class-subject-assessment"
    | "student-subject-assessment"
    | "student"
    | "student-payment"
    | "raw-payment";
  postId?;
}
export interface SubjectPostData extends BasePostData {
  title: string;
  code?: string;
}
export interface ClassPostData extends BasePostData {
  classCode: string;
  classTitle: string;
  classIndex?: number;
}
export interface Data {
  course: string;
  subjects: {
    id?: null;
    code: string;
    subject: string;
    assessments: {
      id?: null;
      code: string;
      type: "test" | "exam";
      obtainable: number;
    }[];
  }[];
  students: {
    id?: null;
    firstName: string;
    surname: string;
    otherName: string;
    gender: "M" | "F";
    rawData: string;
    assessments: {
      id?: null;
      subjectCode: string;
      assessmentCode: string;
      score: number;
    }[];
  }[];
}
export function getResultComment(score) {
  const comments = [
    {
      min: 90,
      max: 100,
      arabic: "ممتاز! أداء رائع واستثنائي.",
      english: "Excellent! Outstanding and exceptional performance.",
    },
    {
      min: 80,
      max: 89,
      arabic: "جيد جدًا! أداء قوي وجهد ملحوظ.",
      english: "Very good! Strong performance and great effort.",
    },
    {
      min: 70,
      max: 79,
      arabic: "جيد! عمل جيد ولكن هناك مجال للتحسين.",
      english: "Good! Well done, but there is room for improvement.",
    },
    {
      min: 60,
      max: 69,
      arabic: "مقبول! تحتاج إلى بذل المزيد من الجهد.",
      english: "Satisfactory! Needs more effort.",
    },
    {
      min: 50,
      max: 59,
      arabic: "ضعيف! حاول تحسين أدائك في المستقبل.",
      english: "Weak! Try to improve your performance in the future.",
    },
    {
      min: 0,
      max: 49,
      arabic: "راسب! بحاجة إلى العمل الجاد والمثابرة.",
      english: "Fail! Needs hard work and persistence.",
    },
  ];

  // const comment = comments.find((c) => score >= c.min && score <= c.max);
  const comment = comments.find((c) => score > c.min - 1 && score < c.max + 1);
  return comment
    ? comment
    : { arabic: "درجة غير صالحة", english: "Invalid score" };
}
