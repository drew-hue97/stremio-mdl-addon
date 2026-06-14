export async function getCatalog(type, id) {
  // TODO: replace with real MDL scraping / API logic

  return {
    metas: [
      {
        id: "mdl-example-1",
        type: "series",
        name: "Example Drama",
        poster: "https://via.placeholder.com/300x450",
        description: "Placeholder MDL item"
      }
    ]
  };
}
