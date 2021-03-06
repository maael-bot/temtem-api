import path from "path";
import got from "got";
import cheerio from "cheerio";
import pipeFile from "../util/pipeFile";
import * as log from "../util/log";

export default async function getConditionIcons() {
  log.info("Starting");
  const result = await got(
    "https://temtem.gamepedia.com/Category:Condition_icons"
  );
  const $ = cheerio.load(result.body);
  const images = $("#mw-content-text")
    .find("img")
    .map((_i, el) => $(el).attr("src"))
    .toArray();
  await Promise.all(
    images.map(async img => {
      const p = path.parse((img as unknown) as string);
      const filename = `${p.name}${p.ext.split("?")[0]}`;
      try {
        await pipeFile((img as unknown) as string, [
          "images",
          "icons",
          "conditions",
          filename
        ]);
      } catch (e) {
        log.error(e.message);
      }
    })
  );
  log.info("Finished");
}
