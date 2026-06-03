import https from "https";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_BOOKS_API_KEY = process.env.BOOKS_API;

export const fetchBooks = (req, res) => {
  const query = req.query.q || "career development";
  const maxResults = Math.min(parseInt(req.query.maxResults) || 12, 40);
  const startIndex = parseInt(req.query.startIndex) || 0;
  const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : "";

  const url = `https://www.googleapis.com/books/v1/volumes`
    + `?q=${encodeURIComponent(query)}`
    + `&maxResults=${maxResults}`
    + `&startIndex=${startIndex}`
    + `&printType=books`
    + `&langRestrict=en`
    + keyParam;

  https.get(url, (apiRes) => {
    let data = "";

    apiRes.on("data", chunk => { data += chunk; });

    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);

        // Catch API-level errors (wrong key, quota exceeded, etc.)
        if (parsed.error) {
          return res.status(502).json({
            success: false,
            message: parsed.error.message,
            code: parsed.error.code,
          });
        }

        const books = (parsed.items || []).map(book => {
          const info = book.volumeInfo;
          return {
            id:          book.id,
            title:       info.title || "Untitled",
            authors:     info.authors?.join(", ") || "Unknown Author",
            publisher:   info.publisher || "",
            publishedDate: info.publishedDate || "",
            description: info.description || "No description available.",
            pageCount:   info.pageCount || null,
            categories:  info.categories || [],
            thumbnail:   info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
            language:    info.language || "en",
            previewLink: info.previewLink || "",
            infoLink:    info.infoLink || "",
            rating:      info.averageRating || null,
            ratingsCount: info.ratingsCount || 0,
          };
        });

        res.json({
          success:     true,
          totalItems:  parsed.totalItems || 0,
          startIndex,
          maxResults,
          books,
        });

      } catch (err) {
        res.status(500).json({ success: false, message: "Failed to parse response" });
      }
    });

  }).on("error", err => {
    res.status(500).json({ success: false, message: err.message });
  });
};
