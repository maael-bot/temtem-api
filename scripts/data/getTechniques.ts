import got from "got";
import cheerio from "cheerio";
import * as log from "../util/log";
import { typedToArray } from "../util/cheerioHelpers";

export interface Technique {
  name: string;
  wikiUrl: string;
}

export default async function getTechniques() {
  log.info("Starting");
  try {
    log.info("Running");
    const result = await got(
      "https://temtem.gamepedia.com/Category:Techniques"
    );
    const $ = cheerio.load(result.body);
    const page = $(".mw-category").last();
    const techniques = typedToArray<Technique>(
      page.find("a").map((_i, el) => {
        return {
          name: $(el)
            .text()
            .trim(),
          wikiUrl: `https://temtem.gamepedia.com${$(el).attr("href")}`
        };
      })
    );
    return techniques.filter(({ name }) => name !== "Training Course");
  } catch (e) {
    log.error(e.message);
  }
}
