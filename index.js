#!/usr/bin/env node

const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.static("public"));

const MDL = "https://mydramalist.github.io/MDL-API";
const TMDB = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_KEY;

// Decode Base64 config
function decodeConfig(base64) {
  try {
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// TMDB lookup
async function resolveTMDB(drama) {
  const query = encodeURIComponent(drama.title);
  const year = drama.year || "";

  const url = `${TMDB}/search/tv?api_key=${TMDB_KEY}&query=${query}&first_air_date_year=${year}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results.length) return null;
  return data.results[0];
}

// Convert MDL → TMDB → Stremio meta
async function mdlToStremio(drama) {
  const tmdb = await resolveTMDB(drama);

  if (!tmdb) {
    return {
      id: `mdl:${drama.id}`,
      type: "series",
      name: drama.title,
      poster: drama.image,
      description: drama.synopsis
    };
  }

  return {
    id: `tmdb:${tmdb.id}`,
    type: "series",
    name: tmdb.name,
    poster: tmdb.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
      : drama.image,
    background: tmdb.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`
      : null,
    description: tmdb.overview || drama.synopsis,
    releaseInfo: tmdb.first_air_date,
    rating: tmdb.vote_average,
    genres: tmdb.genre_ids
  };
}

// Fetch MDL endpoints
async function fetchCustomList(id) {
  const res = await fetch(`${MDL}/list/${id}`);
  const data = await res.json();
  return Promise.all(data.map(mdlToStremio));
}

async function fetchUserLists(username) {
  const res = await fetch(`${MDL}/user/${username}/lists`);
  const data = await res.json();
  return Promise.all(data.map(mdlToStremio));
}

async function fetchCountryList(country, mode) {
  const endpoint =
    mode === "popular"
      ? `${MDL}/top?country=${country}`
      : `${MDL}/trending?country=${country}`;

  const res = await fetch(endpoint);
  const data = await res.json();
  return Promise.all(data.map(mdlToStremio));
}

// Manifest route
app.get("/manifest.json", (req, res) => {
  const configBase64 = req.query.config;
  const cfg = decodeConfig(configBase64) || {};

  const catalogs = [];

  // User lists
  if (cfg.user) {
    catalogs.push({
      id
