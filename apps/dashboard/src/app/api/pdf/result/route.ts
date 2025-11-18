import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { renderToStream } from "@school-clerk/pdf";
import { ResultTemplate } from "@school-clerk/pdf/result-template";
import { z } from "zod";

import { notFound } from "next/navigation";

// import sharp from "sharp";
const paramsSchema = z.object({
  // id: z.string().uuid().optional(),
  // token: z.string().optional(),
  // slugs: z.array(z.number()),
  token: z.string(),
  // templateSlug: z.string().optional().nullable(),
  preview: z.preprocess((val) => val === "true", z.boolean().default(false)),
});
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  // const session = await getServerSession(authOptions);
  //   const result = paramsSchema.safeParse(
  //     Object.fromEntries(requestUrl.searchParams.entries())
  //   );
  const preview = true;
  const safeTitle = "sample";

  const strm = await ResultTemplate({
    //   pages,
    //   watermark,
    //   title: safeTitle,
    //   template: {
    //     size: "A4",
    //   },
  });

  try {
    const stream = await renderToStream(strm);
    if (!stream) {
      return NextResponse.json(
        { error: "Failed to render PDF stream" },
        { status: 500 }
      );
    }

    // return NextResponse.json({ data: "Testing Sentry Error...!", printData });

    // @ts-expect-error - stream is not assignable to BodyInit
    const blob = await new Response(stream).blob();

    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store, max-age=0",
    };

    if (!preview) {
      headers[
        "Content-Disposition"
      ] = `attachment; filename="${safeTitle}.pdf"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${safeTitle}.pdf"`;
    }

    return new Response(blob, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        msg: error.message,
      },
      { status: 500 }
    );
  }
}
