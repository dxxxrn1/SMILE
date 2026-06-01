import dotenv from "dotenv";
import https from "https";

dotenv.config();

const options = {
    headers: {
        'User-Agent': 'SMILE-News-App'
    }
};

// newsdata.io category mapping
// The API accepts their own category names — map your UI filters accordingly
const CATEGORY_MAP = {
    all:          null,                          // no category filter → use country only
    education:    'education',
    employment:   'business',                    // closest available category
    scholarships: 'education',
    events:       'entertainment',
    government:   'politics',
};

// GET /api/news
export const fectNews = (req, res) => {

    const category  = req.query.category || 'all';
    const page      = req.query.page || null;   // newsdata.io uses a cursor token, not a number
    const pageSize  = parseInt(req.query.pageSize) || 10;   // free plan max is 10

    const apiCategory = CATEGORY_MAP[category] ?? null;

    // Build query string
    const params = new URLSearchParams({
        apikey:   process.env.NEW_NEWS_API,
        country:  'za',
        language: 'en',
        size:     Math.min(pageSize, 10),       // cap at 10 for free plan safety
    });

    if (apiCategory) {
        params.set('category', apiCategory);
    }

    // Use nextPage cursor for pagination (newsdata.io style)
    if (page && page !== '1') {
        params.set('page', page);
    }

    const apiUrl = `https://newsdata.io/api/1/latest?${params.toString()}`;

    https.get(apiUrl, options, (apiRes) => {
        let data = '';

        apiRes.on('data', chunk => { data += chunk; });

        apiRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);

                if (parsed.status !== 'success') {
                    return res.status(502).json({
                        success: false,
                        message: parsed.results?.message || 'newsdata.io returned an error',
                    });
                }

                // Normalise articles to match the shape the frontend already expects
                const articles = (parsed.results || [])
                    .filter(a => a.title && a.link)
                    .map(a => ({
                        title:        a.title,
                        description:  a.description || a.content || '',
                        url:          a.link,
                        urlToImage:   a.image_url || null,
                        publishedAt:  a.pubDate,
                        source: {
                            name: a.source_name || a.source_id || 'Unknown',
                        },
                        // pass through the raw newsdata category for optional use
                        category:     Array.isArray(a.category) ? a.category[0] : (a.category || ''),
                    }));

                res.json({
                    success:      true,
                    totalResults: parsed.totalResults || articles.length,
                    // Return the nextPage cursor so the frontend can request the next batch
                    nextPage:     parsed.nextPage || null,
                    articles,
                });

            } catch (err) {
                console.error('[SMILE News] Parse error:', err.message);
                res.status(500).json({ success: false, message: 'Failed to parse API response' });
            }
        });

    }).on('error', (err) => {
        console.error('[SMILE News] Request error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    });
};