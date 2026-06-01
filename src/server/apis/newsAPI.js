import dotenv from "dotenv";
import https from "https";

dotenv.config();

const options = {
    headers: {
        'User-Agent': 'SMILE-News-App'
    }
};

const CATEGORY_MAP = {
    all:          null,
    education:    'education',
    employment:   'business',
    scholarships: 'education',
    events:       'entertainment',
    government:   'politics',
};

// GET /api/news
export const fectNews = (req, res) => {

    const category    = req.query.category || 'all';
    const page        = req.query.page || null;
    const pageSize    = parseInt(req.query.pageSize) || 10;
    const apiCategory = CATEGORY_MAP[category] ?? null;

    if (!process.env.NEW_NEWS_API) {
        console.error('[SMILE News] NEWS_API_KEY is missing from environment variables.');
        return res.status(500).json({ success: false, message: 'News service is not configured.' });
    }

    const params = new URLSearchParams({
        apikey:   process.env.NEW_NEWS_API,
        country:  'za',
        language: 'en',
        size:     Math.min(pageSize, 10),
    });

    if (apiCategory) {
        params.set('category', apiCategory);
    }

    if (page && page !== '1') {
        params.set('page', page);
    }

    const apiUrl = `https://newsdata.io/api/1/latest?${params.toString()}`;

    console.log('[SMILE News] Fetching SA news, category:', category);

    https.get(apiUrl, options, (apiRes) => {
        let data = '';

        apiRes.on('data', chunk => { data += chunk; });

        apiRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);

                if (parsed.status !== 'success') {
                    console.error('[SMILE News] API error:', parsed.results?.message);
                    return res.status(502).json({
                        success: false,
                        message: parsed.results?.message || 'newsdata.io returned an error',
                    });
                }

                const articles = (parsed.results || [])
                    .filter(a => a.title && a.link)
                    .map(a => ({
                        title:       a.title,
                        description: a.description || a.content || '',
                        url:         a.link,
                        urlToImage:  a.image_url || null,
                        publishedAt: a.pubDate,
                        source: {
                            name: a.source_name || a.source_id || 'Unknown',
                        },
                        category: Array.isArray(a.category) ? a.category[0] : (a.category || ''),
                    }));

                res.json({
                    success:      true,
                    totalResults: parsed.totalResults || articles.length,
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