import cheerio from "cheerio";
import * as log from "../util/log";
import write from "../util/write";
import fetchHTML from "../util/fetchHTML";
import { cleanToNumber } from "../util/cleaners";
import { typedToArray } from "../util/cheerioHelpers";
import { Temtem as MinimalTemtem } from "./getKnownTemtemSpecies";

export enum TechniqueSource {
  LEVELLING = "Levelling",
  TECHNIQUE_COURSES = "TechniqueCourses",
  BREEDING = "Breeding"
}

export enum TemtemEvolutionType {
  LEVEL = "level",
  SPECIAL = "special"
}

export interface TemtemTechnique {
  name: string;
  source: TechniqueSource;
}

export interface TemtemLocation {
  location: string;
  island: string;
  frequency: string;
  level: string;
}

export interface TemtemEvolutionTree {
  number: number;
  name: string;
  stage: number;
}

export interface TemtemEvolution {
  stage?: number;
  evolutionTree?: TemtemEvolutionTree[];
  evolves?: true;
  type: TemtemEvolutionType;
  description?: string;
}

export interface TemtemNoEvolution {
  evolves: false;
}

export interface Temtem extends MinimalTemtem {
  traits: string[];
  details: {
    height: {
      cm: number;
      inches: number;
    };
    weight: {
      kg: number;
      lbs: number;
    };
  };
  techniques: TemtemTechnique[];
  trivia: string[];
  evolution: TemtemEvolution | TemtemNoEvolution;
  wikiPortraitUrlLarge: string;
  lumaWikiPortraitUrlLarge: string;
  locations: TemtemLocation[];
  icon: string;
  lumaIcon: string;
}

export default async function embellishKnownTemtemSpecies(
  ar: MinimalTemtem[]
): Promise<Temtem[] | undefined> {
  log.info(`Embellishing ${ar.length} tems`);
  try {
    const webpages = await fetchHTML("temtem", ar, "name", true);
    const result = webpages
      .map(({ item, html }) => {
        return {
          ...item,
          traits: getTraits(html),
          details: getDetails(html),
          techniques: getTechniques(html),
          trivia: getTrivia(html),
          evolution: getEvolutionInfo(ar, item, html),
          wikiPortraitUrlLarge: getWikiPortraitUrl(html),
          lumaWikiPortraitUrlLarge: "",
          locations: getLocations(html),
          icon: `/images/portraits/temtem/large/${item.name}.png`,
          lumaIcon: `/images/portraits/temtem/luma/large/${item.name}.png`
        };
      })
      .sort((a, b) => a.number - b.number);
    await write("knownTemtemSpecies", result);
    return result;
  } catch (e) {
    log.error(e);
  }
}

function getLocations(html: string) {
  const $ = cheerio.load(html);
  const locations = typedToArray<TemtemLocation>(
    $("#Location")
      .parent()
      .next("table")
      .find("tbody>tr")
      .map((_i, row) => {
        const cells = $(row).find("td");
        const item = (cells
          .map((_j, cell) => {
            return $(cell)
              .text()
              .trim();
          })
          .toArray() as unknown) as string[];
        // tslint:disable-next-line:strict-type-predicates
        if (item[0] === undefined || item.every(i => i === "?"))
          return undefined;
        return {
          location: item[0],
          island: item[1],
          frequency: (item[2] || "").replace(/\[\d+\]/, ""),
          level: (item[3] || "").replace(/\[\d+\]/, "")
        };
      })
  );
  return locations;
}

function getWikiPortraitUrl(html: string) {
  const $ = cheerio.load(html);
  return (
    $("#mw-content-text .infobox-table img")
      .first()
      .attr("src") || ""
  );
}

function getTraits(html: string) {
  const $ = cheerio.load(html);
  const $traitInfo = $(".infobox-row")
    .filter((_i, el) => {
      return !!$(el)
        .text()
        .includes("Traits");
    })
    .first()
    .find(".infobox-row-value")
    .last();
  return typedToArray<string>(
    $traitInfo.find("a").map((_i, el) =>
      $(el)
        .text()
        .trim()
    )
  );
}

function getDetails(html: string) {
  const $ = cheerio.load(html);
  const heightInfo = $(".infobox-row")
    .filter((_i, el) => {
      return !!$(el)
        .text()
        .includes("Height");
    })
    .first()
    .find(".infobox-row-value")
    .last()
    .text();
  const weightInfo = $(".infobox-row")
    .filter((_i, el) => {
      return !!$(el)
        .text()
        .includes("Weight");
    })
    .first()
    .find(".infobox-row-value")
    .last()
    .text();
  return {
    height: {
      cm: cleanToNumber(getDetailSafely(heightInfo, "cm", 0)),
      inches: cleanToNumber(getDetailSafely(heightInfo, '"', 1))
    },
    weight: {
      kg: cleanToNumber(getDetailSafely(weightInfo, "kg", 0)),
      lbs: cleanToNumber(getDetailSafely(weightInfo, "lbs", 1))
    }
  };
}

function getDetailSafely(str: string, key: string, i: number) {
  if (!str.includes(key)) return 0;
  try {
    return parseInt(str.split("/")[i], 10);
  } catch {
    return 0;
  }
}

function getTechniques(html: string) {
  const $ = cheerio.load(html);
  const techniques: any[] = [];
  $("#mw-content-text table").each((_i, el) => {
    const type = getTechniqueTableType(
      $(el)
        .find("caption")
        .first()
        .text()
        .trim()
    );
    if (!type) return undefined;
    const typeTechniques = getTechniquesFromTable($, el, type);
    techniques.push(...typeTechniques);
  });
  return techniques;
}

function getTechniqueTableType(caption: string) {
  if (!caption.startsWith("List of Techniques")) return undefined;
  if (caption.includes("Leveling")) {
    return TechniqueSource.LEVELLING;
  } else if (caption.includes("Courses")) {
    return TechniqueSource.TECHNIQUE_COURSES;
  } else if (caption.includes("Breeding")) {
    return TechniqueSource.BREEDING;
  } else {
    return undefined;
  }
}

function getTechniquesFromTable(
  $: CheerioStatic,
  table: CheerioElement,
  type: ReturnType<typeof getTechniqueTableType>
) {
  return $(table)
    .find("tbody>tr")
    .map((i, el) => {
      if (i === 0) return undefined;
      const tdIndex = type === "Breeding" ? 0 : 1;
      const techniqueName = $(el)
        .find("td")
        .eq(tdIndex)
        .text()
        .trim();
      return !techniqueName || techniqueName === "?"
        ? undefined
        : { name: techniqueName, source: type };
    })
    .toArray()
    .filter(Boolean);
}

function getTrivia(html: string) {
  const $ = cheerio.load(html);
  const trivia = typedToArray<string>(
    $("#Trivia")
      .parent()
      .next()
      .find("li")
      .map((_i, el) =>
        $(el)
          .text()
          .replace(/\[.\]/g, "")
          .replace(/\\/g, "")
          .trim()
      )
  );
  return trivia;
}

function getEvolutionInfo(items: any[], item: any, html: string) {
  const $ = cheerio.load(html);
  const $evolutionHeader = $("#Evolution");
  if ($evolutionHeader.length) {
    let $evolutionTable = $evolutionHeader.parent().next();
    if (!$evolutionTable.is("table")) {
      $evolutionTable = $evolutionTable.next();
      if (!$evolutionTable.is("table")) {
        $evolutionTable = $evolutionTable.next();
        if (!$evolutionTable.is("table")) {
          if (item.name === "Tuwai" || item.name === "Tuvine") {
            return {
              stage: item.name === "Tuwai" ? 1 : 2,
              evolutionTree: [],
              evolves: true,
              type: "special",
              description:
                "Tuwai can evolve into Tuvine by taking one to the Crystal Shrine, and selecting it. This requires that you beat the Cultist Hunt side-quest."
            } as any;
          }
          log.warn("Gave up on evolution table for", item.name);
          return {};
        }
      }
    }
    const evolutionParts: (string | number)[] = [];
    $evolutionTable.find("tbody>tr>td").each((i, el) => {
      const text = $(el)
        .text()
        .trim();
      if (
        text.includes("Levels") ||
        ($(el).children("a").length && text !== "" && text !== "100x100px")
      ) {
        evolutionParts.push(
          isNaN(parseInt(text, 10)) ? text : parseInt(text, 10)
        );
      }
    });
    if (item.name === "Zaobian") {
      evolutionParts.splice(0, 2);
    }
    const evolutionTree = evolutionParts.reduce<any>((prev, cur) => {
      if (typeof cur === "string" && !cur.includes("Levels")) {
        const evoItem = items.find(({ name }) => name === cur);
        prev.push({
          number: evoItem ? evoItem.number : -1,
          name: cur,
          stage: Number(prev.length) + 1
        });
      } else if (prev.length) {
        prev[prev.length - 1].levels = cur;
      }
      return prev;
    }, []);
    return {
      stage:
        Number(evolutionTree.findIndex(({ name }) => item.name === name)) + 1,
      evolutionTree,
      evolves: true,
      type: "level"
    };
  } else {
    return {
      evolves: false
    };
  }
}
