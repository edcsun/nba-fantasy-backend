const Joi = require("joi");
const express = require("express");
const app = express();
const JsonFileSaver = require("./jsonFileSaver");
console.log("start");
app.use(express.json());

let players = [];
let multipliers = {};
const playerJsonSaver = new JsonFileSaver("players.json");
const multiplierJsonSaver = new JsonFileSaver("multipliers.json");
playerJsonSaver.load(playerData => {
  players = playerData;
});
multiplierJsonSaver.load(multiplierData => {
  multipliers = multiplierData;
});

app.get("/api/players", (req, res) => {
  const { format, showHeader } = req.query;
  if (format === "csv") {
    res.type("text/plain");
    res.send(
      (showHeader
        ? `,"fg%","ft%","3pt","pt","rbl","ast","stl","blk","to","extra","remarks"\r\n`
        : "") +
        players
          .map(p => {
            const { stats } = p;
            return `"${p.name}","${stats.fg}","${stats.ft}","${
              stats["3pt"]
            }","${stats.pt}","${stats.rbl}","${stats.ast}","${stats.stl}","${
              stats.blk
            }","${stats.to}","${stats.extra}","${p.remarks || ""}"`;
          })
          .join("\r\n")
    );
  } else {
    res.send(
      players
        .map(p => {
          let p2 = JSON.parse(JSON.stringify(p));
          const { fg, ft, pt, rbl, ast, stl, blk, to } = p2.stats;
          const three_pt = p2.stats["3pt"];
          p2.score = fg + ft + three_pt + pt + rbl + ast + stl + blk + to;
          p2.score = Math.round(p2.score * 100) / 100;
          return p2;
        })
        .sort((a, b) => {
          if (a.score > b.score) return -1;
          if (a.score < b.score) return 1;
          return 0;
        })
    );
  }
});

app.get("/api/players/:id", (req, res) => {
  const player = players.find(p => p.id === parseInt(req.params.id));
  if (!player)
    res.status(404).send("The player with the given id was not found.");
  res.send(player);
});

app.post("/api/player/add", (req, res) => {
  const { error } = validatePlayer(req.body);
  if (error) {
    console.log(error);
    res.status(400).send(error.details[0].message);
    return;
  }
  const { name, stats, remarks } = req.body;
  const player = {
    id: Math.max.apply(Math, players.map(p => p.id)) + 1,
    name: name,
    stats: stats,
    remarks: remarks
  };
  players.push(player);
  playerJsonSaver.save(players, () => res.send(player));
});

app.post("/api/players/add", (req, res) => {
  const { error } = validatePlayers(req.body);
  if (error) {
    res.status(400).send(error.details[0].message);
    return;
  }
  const newPlayers = req.body.map(p => ({
    id: Math.max.apply(Math, players.map(p => p.id)) + 1,
    name: p.name,
    stats: p.stats,
    remarks: p.remarks
  }));
  players = players.concat(newPlayers);
  playerJsonSaver.save(players, () => res.send(newPlayers));
});

app.put("/api/player/:id", (req, res) => {
  const { id } = req.params;
  const player = players.find(p => p.id === parseInt(id));
  if (!player) res.status(404).send(`player with id ${id} not found.`);
  const { name, remarks, stats } = req.body;
  player.name = name;
  player.stats = stats || {};
  player.remarks = remarks;

  const { error } = validatePlayer(player);
  if (error) res.status(400).send(error.details[0].message);

  playerJsonSaver.save(players, () => res.send(player));
});

app.put("/api/player/:id/attr/:attrCode", (req, res) => {
  const { id, attrCode } = req.params;
  const player = players.find(p => p.id === parseInt(id));
  if (!player) res.status(404).send(`player with id ${id} not found.`);
  switch (attrCode) {
    case "fg":
    case "ft":
    case "3pt":
    case "pt":
    case "rbl":
    case "ast":
    case "rbl":
    case "stl":
    case "blk":
    case "to":
    case "extra":
      player.stats[attrCode] = req.body[attrCode];
      break;
    case "name":
    case "remarks":
      player[attrCode] = req.body[attrCode];
      break;
  }
  const { error } = validatePlayer(player);
  if (error) res.status(400).send(error.details[0].message);

  playerJsonSaver.save(players, () => res.send(player));
});

app.delete("/api/player/:id", (req, res) => {
  const { id } = req.params;
  const player = players.find(p => p.id === parseInt(id));
  if (!player) res.status(404).send(`player with id ${id} not found.`);

  const index = players.indexOf(player);
  players.splice(index, 1);

  playerJsonSaver.save(players, () => res.send(player));
});

app.get("/api/multipliers", (req, res) => {
  res.send(multipliers);
});

app.post("/api/multipliers/fullset", (req, res) => {
  const { error } = validateMultipliers(req.body);
  if (error) res.status(400).send(error.details[0].message);
  multipliers = req.body;
  multiplierJsonSaver.save(multipliers, () => res.send(multipliers));
});

function validatePlayer(player) {
  const schema = {
    id: Joi.number().integer(),
    name: Joi.string()
      .min(3)
      .required(),
    stats: Joi.object({
      fg: Joi.number(),
      ft: Joi.number(),
      "3pt": Joi.number().min(0),
      pt: Joi.number().min(0),
      rbl: Joi.number().min(0),
      ast: Joi.number().min(0),
      stl: Joi.number().min(0),
      blk: Joi.number().min(0),
      to: Joi.number().max(0),
      extra: Joi.number()
    }),
    remarks: Joi.string().allow("")
  };
  return Joi.validate(player, schema);
}

function validatePlayers(players) {
  const schema = Joi.array().items(
    Joi.object({
      id: Joi.number().integer(),
      name: Joi.string()
        .min(3)
        .required(),
      stats: Joi.object({
        fg: Joi.number(),
        ft: Joi.number(),
        "3pt": Joi.number().min(0),
        pt: Joi.number().min(0),
        rbl: Joi.number().min(0),
        ast: Joi.number().min(0),
        stl: Joi.number().min(0),
        blk: Joi.number().min(0),
        to: Joi.number().max(0),
        extra: Joi.number()
      }),
      remarks: Joi.string().allow("")
    })
  );
  return Joi.validate(players, schema);
}

function validateMultipliers(multipliers) {
  const schema = {
    fg: Joi.number().min(0),
    ft: Joi.number().min(0),
    "3pt": Joi.number().min(0),
    pt: Joi.number().min(0),
    rbl: Joi.number().min(0),
    ast: Joi.number().min(0),
    stl: Joi.number().min(0),
    blk: Joi.number().min(0),
    to: Joi.number().min(0),
    extra: Joi.number().min(0)
  };
  return Joi.validate(multipliers, schema);
}

//PORT
const port = 4000;
app.listen(port, () => console.log(`Listening on port ${port}`));
