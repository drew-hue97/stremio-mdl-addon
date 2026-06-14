#!/usr/bin/env node

const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const MDL = "https://mydramalist.github.io/MDL-API";

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

// Fetch MDL list by country + mode
async function fetchCountryList(country, mode) {
  const endpoint =
    mode === "popular"
      ? `${MDL}/top?country=${country}`
      : `${MDL}/trending?country=${country}`;

  const res = await fetch(endpoint);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Fetch MDL user profile lists
async function fetchUserLists(username) {
  const res = await fetch(`${MDL}/user/${username}/lists`);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Fetch MDL custom list by ID
async function fetchCustomList(listId) {
  const res = await fetch(`${MDL}/list/${listId}`);
  const data = await res.json();
  return data.map(mdlToMeta);
}

// Manifest
const manifest = {
  id: "org.drew.mdl.asian",
  version: "1.0.0",
  name: "MyDramaList Addon",
  description: "Asian drama catalogs, user lists, and custom lists from MDL",
  resources: ["catalog"],
  types: ["series"],
  catalogs: [
    // Country catalogs
    { id: "popular-kr", type: "series", name: "Popular Korean Dramas" },
    { id: "trending-kr", type: "series", name: "Trending Korean Dramas" },

    { id: "popular-jp", type: "series", name: "Popular Japanese Dramas" },
    { id: "trending-jp", type: "series", name: "Trending Japanese Dramas" },

    { id: "popular-cn", type: "series", name: "Popular Chinese Dramas" },
    { id: "trending-cn", type: "series", name: "Trending Chinese Dramas" },

    { id: "popular-th", type: "series", name: "Popular Thai Dramas" },
    { id: "trending-th", type: "series", name: "Trending Thai Dramas" },

    { id: "popular-hk", type: "series", name: "Popular Hong Kong Dramas" },
    { id: "trending-hk", type: "series", name: "Trending Hong Kong Dramas" },

    // User lists (dynamic)
    {
      id: "userlists",
      type: "series",
      name: "MDL User Lists",
      extra: [{ name: "username", isRequired: true }]
    },

    // Custom list by ID
    {
      id: "customlist",
      type: "series",
      name: "MDL Custom List",
      extra: [{ name: "listId", isRequired: true }]
    }
  ]
};

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ id, extra }) => {
  try {
    // Country catalogs
    if (id.includes("-")) {
      const [mode, country] = id.split("-");
      const metas = await fetchCountryList(country, mode);
      return { metas };
    }

    // User lists
    if (id === "userlists") {
      const metas = await fetchUserLists(extra.username);
      return { metas };
    }

    // Custom list
    if (id === "customlist") {
      const metas = await fetchCustomList(extra.listId);
      return { metas };
    }

    return { metas: [] };
  } catch (err) {
    console.error("Catalog error:", err);
    return { metas: [] };
  }
});

// Serve
serveHTTP(builder.getInterface(), { port: process.env.PORT || 3000 });
console.log("MDL Addon running on port", process.env.PORT || 3000);
