import { env } from "@/env.mjs";
import { generateAllMissingDiffs } from "@/lib/generateAllMissingDiffs";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  // Authenticate webhook
  if (req.headers.get("x-hub-signature-256") !== env.WEBHOOK_SECRET) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const eventSchema = z.object({
    action: z.enum(["published", "created", "released"]),
    release: z.object({ name: z.string() }),
  });

  const event = eventSchema.safeParse(req.body);

  if (!event.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (event.data.action !== "released") {
    //Ignore other events, we will just use the "released" event
    return NextResponse.json({ success: true });
  }

  NextResponse.json({ success: true });

  console.log(
    `Detected new release: ${event.data.release.name}. Generating diffs...`
  );

  try {
    await generateAllMissingDiffs();
    console.log("Done!");
  } catch (error) {
    console.error(error);
  }
}
