import type { PageDataMeta } from "./type";

type PaginationQuery = { size?: number | null; cursor?: string | number | null };
type CountModel<TWhere> = {
  count: (args: { where?: TWhere }) => PromiseLike<number>;
};

export async function queryResponse<T, TWhere>(
  data: T[],
  {
    query,
    model,
    where,
  }: {
    query?: PaginationQuery;
    model?: CountModel<TWhere>;
    where?: TWhere;
  }
) {
  let meta = {} as PageDataMeta;

  // where.deletedAt = null;
  if (model) {
    const count = await model.count({
      where,
    });
    const size = query?.size || 20;
    meta.count = count;
    let cursor = (Number(query?.cursor) || 0) + size;

    meta.cursor = cursor < count ? String(cursor) : null;
    meta.hasNextPage = cursor < count;
    meta.hasPreviousePage = cursor > 0;
  }
  return {
    data,
    meta,
  };
}
export function queryMeta(query?: any) {
  const take = query.size ? Number(query.size) : 20;
  const { cursor = 0 } = query;
  const [sort, sortOrder = "desc"] = (query.sort || "createdAt").split(".");
  const multiSorts = query.sort?.split(",");
  const orderBy =
    multiSorts?.length > 1
      ? multiSorts.map((ms: string) => {
          const [sort, _sortOrder] = ms.split(".");
          return {
            [sort ?? "createdAt"]: _sortOrder || "desc",
          };
        })
      : {
          [sort]: sortOrder,
        };
  const skip = Number(cursor);

  return {
    skip,
    take,
    orderBy,
  };
}
export async function composeQueryData<TWhere, TModel extends CountModel<TWhere>>(
  query: PaginationQuery,
  where: TWhere,
  model: TModel,
) {
  const md = await queryResponse([], {
    query,
    model,
    where,
  });
  function response<T>(data: T[]) {
    return {
      meta: md.meta,
      data,
    };
  }
  const searchMeta = queryMeta(query);
  return {
    model,
    response,
    searchMeta,
    where,
  };
}
export function composeQuery<T>(
  queries: T[],
  relation: "AND" | "OR" = "AND"
): T | undefined {
  if (!Array.isArray(queries) || queries.length === 0) {
    return undefined;
  }
  return queries.length > 1
    ? ({
        AND: relation == "AND" ? queries : undefined,
        OR: relation != "AND" ? queries : undefined,
      } as T)
    : queries[0];
}
