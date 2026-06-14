export const manifest = {
  id: "com.aquelemiguel.stremio-mdl",
  version: "1.0.0",
  name: "MyDramaList",
  description: "Add MyDramaList lists as Stremio catalogs.",
  logo: "https://stremio-mdl.onrender.com/logo.png",
  resources: ["catalog"],
  types: ["movie", "series"],
  catalogs: [
    {
      type: "series",
      id: "mdl-trending",
      name: "MDL Trending"
    }
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false
  }
};
