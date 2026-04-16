import dotenv from "dotenv";
import https from "https";

dotenv.config();

console.log(process.env.NEWS_API_KEY);
console.log(process.env.NEWS_API_KEY);

const options = {
  headers: {
    'User-Agent': 'SMILE-News-App'
  }
};


export const fectNews =  (req, res) => {
    // Category → keyword mapping
    const CATEGORY_KEYWORDS = {

        all:          'education youth South Africa',

        education:    'education schools South Africa',

        employment:   'youth employment jobs South Africa',

        scholarships: 'scholarships bursaries South Africa students',

        events:       'youth events expo South Africa',

        government:   'education government policy South Africa NSFAS',
    };
    
    const category = req.query.category || 'all';
    const q        = req.query.q || CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all;
    const sortBy   = ['publishedAt', 'relevancy', 'popularity'].includes(req.query.sortBy)
                        ? req.query.sortBy
                        : 'publishedAt';
    const page     = parseInt(req.query.page)     || 1;
    const pageSize = parseInt(req.query.pageSize) || 9;
    
    const apiUrl = `https://newsapi.org/v2/everything?`
        + `q=${encodeURIComponent(q)}`
        + `&language=en`
        + `&sortBy=${sortBy}`
        + `&page=${page}`
        + `&pageSize=${pageSize}`
        + `&apiKey=${process.env.NEWS_API_KEY}`;
    
   https.get(apiUrl, options, (apiRes) => {
    let data = '';

    apiRes.on('data', chunk => { data += chunk; });

    apiRes.on('end', () => {
        try {
            const parsed = JSON.parse(data);

            if (parsed.status !== 'ok') {
                return res.status(502).json({
                    success: false,
                    message: parsed.message || 'NewsAPI returned an error',
                });
            }

            const articles = (parsed.articles || []).filter(
                a => a.title && a.title !== '[Removed]' && a.url
            );

            res.json({
                success: true,
                totalResults: parsed.totalResults,
                page,
                pageSize,
                articles,
            });

        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to parse API response' });
        }
    });

}).on('error', (err) => {
    res.status(500).json({ success: false, message: err.message });
});
}