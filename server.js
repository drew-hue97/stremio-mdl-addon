import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { manifest } from "./manifest.js";
import { getCatalog } from "./catalog.js";

dotenv.config();

const app = express();
app.use(cors());

// ✅ ROOT MANIFEST (THIS FIXES YOUR ORIGINAL ERROR)
app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

// Optional health check
app.get("/", (req, res) => {
  res.send("Stremio MDL Addon Running");
});

// 📚 CATALOG ROUTE (REQUIRED FOR YOUR ADDON TYPE)
app.get("/catalog/:type/:id.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    const data = await getCatalog(type, id);

    res.json(data);
  } catch (err) {
    res.status(500).send("Catalog error");
  }
});

// 🔥 IMPORTANT: Render PORT binding
const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Addon running on port ${PORT}`);
});
