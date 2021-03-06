import { NextApiRequest, NextApiResponse } from "next";
import log from "./logger";

export default function logHit(
  next: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  page: string
) {
  return async function(req: NextApiRequest, res: NextApiResponse) {
    await attemptLog(req, page);
    await next(req, res);
  };
}

export async function attemptLog(req: NextApiRequest, page: string) {
  if (
    !["localhost", "temtem-api.mael.tech", "https://temtem-api-"].some(i =>
      (req.headers.referer || "").includes(i)
    ) ||
    page === "info"
  ) {
    await log({
      page,
      eventType: "hit",
      referer: req.headers.referer || "unknown"
    });
  }
}
