#!/usr/bin/env node

const express = require("express");
const fetch = require("node-fetch");
const { addonBuilder, getRouter } = require("stremio-addon-sdk");

const app = express();
app.use(express.static("public"));

const MDL = "https://mydramalist.github.io/MDL-API";

// Decode config from ?config=BASE64
function decodeConfig(req) {
  const raw = req.query.config;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch (e) {
    return null;
  }
}

// Convert MDL → Stremio meta
function mdlToMeta(item) {
  return {
    id: `mdl:${item.id}`,
    type: "series",
    name: item.title,
    poster: item.image || item.poster,
    posterShape: "poster",
    description: item.synopsis,
    releaseInfo: item.year,
    genres: item.genres || [],
    rating: item.score
  };
}

// Fetch MDL custom list
async function fetchCustomList(listId) {
  const res = await fetch(`${MDL}/list/${listId}`);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Fetch MDL user lists
async function fetchUserLists(username) {
  const res = await fetch(`${MDL}/user/${username}/lists`);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Fetch MDL country lists
async function fetchCountryList(country, mode) {
  const endpoint =
    mode === "popular"
      ? `${MDL}/top?country=${country}`
      : `${MDL}/trending?country=${country}`;

  const res = await fetch(endpoint);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Dynamic manifest route
app.get("/manifest.json", (req, res) => {
  const cfg = decodeConfig(req) || {};

  const catalogs = [];

  // User lists
  if (cfg.user) {
    catalogs.push({
      id: `user-${cfg.user}`,
      type: "series",
      name: `MDL User Lists – ${cfg.user}`
    });
  }

  // Custom lists
  (cfg.lists || []).forEach((list) => {
    catalogs.push({
      id: `custom-${list.id}`,
      type: "series",
      name: list.name || `MDL List ${list.id}`
    });
  });

  // Popular / Trending
  const inc = cfg.includePopularTrending || {};
  const countries = ["kr", "jp", "cn", "th", "hk"];

  countries.forEach((c) => {
    if (inc[c]) {
      catalogs.push({
        id: `popular-${c}`,
        type: "series",
        name: `Popular ${c.toUpperCase()} Dramas`
      });
      catalogs.push({
        id: `trending-${c}`,
        type: "series",
        name: `Trending ${c.toUpperCase()} Dramas`
      });
    }
  });

  const manifest = {
    id: "org.drew.mdl.dynamic",
    version: "1.0.0",
    name: "MyDramaList Dynamic Addon",
    description: "User-configurable MDL addon for Stremio",
    resources: ["catalog"],
    types: ["series"],
    catalogs
  };

  res.json(manifest);
});

// Stremio catalog handler
app.get("/catalog/:type/:id.json", async (req, res) => {
  const { id } = req.params;
  const cfg = decodeConfig(req) || {};

  try {
    // User lists
    if (id.startsWith("user-")) {
      const username = id.replace("user-", "");
      const metas = await fetchUserLists(username);
      return res.json({ metas });
    }

    // Custom lists
    if (id.startsWith("custom-")) {
      const listId = id.replace("custom-", "");
      const metas = await fetchCustomList(listId);
      return res.json({ metas });
    }

    // Popular / Trending
    if (id.includes("-")) {
      const [mode, country] = id.split("-");
      const metas = await fetchCountryList(country, mode);
      return res.json({ metas });
    }

    res.json({ metas: [] });
  } catch (err) {
    console.error(err);
    res.json({ metas: [] });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("MDL Addon running on port", PORT);
});
