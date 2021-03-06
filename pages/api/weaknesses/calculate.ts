import cors from "../../../util/cors";
import { TYPES } from "../../../util/constants";
import logHit from "../../../util/logHit";

const weaknesses = require("../../../data/weaknesses.json");

export default cors(
  logHit(async (req, res) => {
    const query = req.query as Record<string, string>;
    const attacking = (query.attacking || "").trim();
    const defending = (query.defending || "").split(",").map(t => t.trim());
    if (
      attacking.length &&
      TYPES.includes(attacking) &&
      defending.length &&
      defending.every(d => TYPES.includes(d))
    ) {
      const attackingRow = weaknesses[attacking];
      const defendingModifiers = defending.map(d => attackingRow[d]);
      res.json({
        attacking,
        defending,
        modifiers: defendingModifiers,
        result: defendingModifiers.reduce((pre, cur) => pre * cur, 1)
      });
    } else {
      res.status(400).json({ error: "An unknown type is present" });
    }
  }, "weaknesses/calculate")
);
