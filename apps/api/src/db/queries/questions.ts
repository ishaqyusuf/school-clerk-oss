import type { TRPCContext } from "@api/trpc/init";
import type { QuestionData, QuestionQuery } from "@api/trpc/schemas/schemas";
import { composeQuery } from "@api/utils";
import { getClassroomSubjectByName } from "./subjects";

export async function loadQuestions(
  { db, profile }: TRPCContext,
  query: QuestionQuery
) {
  const queries: any[] = [
    {
      name: "Question",
    },
  ];
  const { classDepartmentId, subjectId, postId } = query;
  Object.entries({ classDepartmentId, subjectId }).forEach(([key, value]) => {
    if (value) {
      const ids = value?.split(",");
      if (ids.length > 1)
        queries.push({
          OR: ids.map((id) => ({
            data: {
              path: key,
              equals: id,
            },
          })),
        });
      else
        queries.push({
          data: {
            path: key,
            equals: value,
          },
        });
    }
  });
  if (postId)
    queries.push({
      id: postId,
    });
  const questions = await db.posts.findMany({
    where: composeQuery(queries),
  });
  return questions.map((question) => ({
    id: question.id,
    ...((question.data as any) || {}),
  })) as QuestionData[];
}

export async function saveQuestion(ctx: TRPCContext, data: QuestionData) {
  let { id, ...meta } = data;
  const { db } = ctx;
  const subject = await getClassroomSubjectByName(
    ctx,
    meta.subject,
    meta.classDepartmentId
  );
  meta.subjectId = subject.id;
  if (id)
    await db.posts.update({
      where: { id },
      data: {
        data: meta,
      },
    });
  else {
    const q = await db.posts.create({
      data: {
        name: "Question",
        data: meta as any,
      },
    });
    id = q.id;
  }
  return id;
}
