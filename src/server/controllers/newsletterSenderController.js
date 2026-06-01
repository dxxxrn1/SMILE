import { sql, connectToDB } from "../dbConnection/dbconnection.js";
import nodemailer from "nodemailer";
import https from "https";

const createSmileMailTransport = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.LUCAS_EMAIL,
            pass: process.env.LUCAS_APP_PASS
        }
    });
};

function fetchLatestNews() {
    return new Promise((resolve, reject) => {

        const params = new URLSearchParams({
            apikey: process.env.NEW_NEWS_API,
            country: "za",
            language: "en",
            size: 5
        });

        const url = `https://newsdata.io/api/1/latest?${params.toString()}`;

        https.get(url, (response) => {

            let data = "";

            response.on("data", chunk => {
                data += chunk;
            });

            response.on("end", () => {
                try {
                    const parsed = JSON.parse(data);

                    const articles = (parsed.results || [])
                        .slice(0, 5)
                        .map(article => ({
                            title: article.title,
                            description: article.description || "",
                            link: article.link
                        }));

                    resolve(articles);

                } catch (err) {
                    reject(err);
                }
            });

        }).on("error", reject);
    });
}

export const sendNewsletterToSubscribers = async (req, res) => {

    try {

        const pool = await connectToDB();

        const subscribers = await pool.request().query(`
            SELECT Email
            FROM NewsletterSubscriptions
        `);

        if (!subscribers.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "No subscribers found."
            });
        }

        const articles = await fetchLatestNews();

        const newsHtml = articles.map(article => `
            <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #334155;">
                <h3 style="margin:0 0 8px;color:#f8fafc;">
                    ${article.title}
                </h3>

                <p style="color:#cbd5e1;line-height:1.5;">
                    ${article.description}
                </p>

                <a href="${article.link}"
                   style="color:#ec4899;text-decoration:none;font-weight:600;">
                   Read Full Article →
                </a>
            </div>
        `).join("");

        const transport = createSmileMailTransport();

        let successCount = 0;
        let failCount = 0;

        for (const subscriber of subscribers.recordset) {
            try {

                await transport.sendMail({
                    from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
                    to: subscriber.Email,
                    subject: "📰 SMILE Weekly Newsletter",
                    html: `
                        <div style="
                            max-width:650px;
                            margin:auto;
                            padding:30px;
                            background:#0f172a;
                            color:#fff;
                            font-family:Arial,sans-serif;
                        ">

                            <h1 style="color:#ec4899;">
                                SMILE Weekly Newsletter
                            </h1>

                            <p>
                                Here are the latest opportunities,
                                education updates and youth news from
                                South Africa.
                            </p>

                            ${newsHtml}

                            <hr style="margin:30px 0;border-color:#334155;">

                            <p style="font-size:12px;color:#94a3b8;">
                                SMILE Platform • Empowering South African Youth
                            </p>

                        </div>
                    `
                });

                successCount++;

                console.log(`Newsletter sent to ${subscriber.Email}`);

            } catch (err) {

                failCount++;

                console.error(
                    `Failed sending to ${subscriber.Email}`,
                    err.message
                );
            }
        }

        return res.status(200).json({
            success: true,
            sent: successCount,
            failed: failCount
        });

    } catch (err) {

        console.error("sendNewsletterToSubscribers error:", err);

        return res.status(500).json({
            success: false,
            message: "Newsletter sending failed."
        });
    }
};