import * as t from "io-ts";

const Priority = t.union([
  t.literal("ultra"),
  t.literal("veryhigh"),
  t.literal("high"),
  t.literal("normal"),
  t.literal("low"),
  t.literal("verylow"),
  t.literal("unknown")
]);

const SynergyType = t.union([
  t.literal("damage"),
  t.literal("buff"),
  t.literal("debuff"),
  t.literal("condition"),
  t.literal("priority"),
  t.literal("unknown")
]);

export const Codec = t.type({
  name: t.string,
  wikiUrl: t.string,
  type: t.string,
  class: t.string,
  classIcon: t.string,
  damage: t.number,
  staminaCost: t.number,
  hold: t.number,
  priority: Priority,
  synergy: t.string,
  synergyEffects: t.array(
    t.type({ effect: t.string, damage: t.number, type: SynergyType })
  ),
  targets: t.string,
  description: t.string
});

export const TechniqueList = t.array(Codec);

export type Technique = t.TypeOf<typeof Codec>;
