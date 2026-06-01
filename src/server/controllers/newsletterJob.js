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

                    resolve(
                        (parsed.results || []).slice(0, 5)
                    );
                } catch (err) {
                    reject(err);
                }
            });
        }).on("error", reject);
    });
}

export const sendNewsletterToSubscribersJob = async () => {

    const pool = await connectToDB();

    const subscribers = await pool.request().query(`
        SELECT Email
        FROM NewsletterSubscriptions
    `);

    if (!subscribers.recordset.length) {
        console.log("No subscribers found.");
        return;
    }

    const articles = await fetchLatestNews();

    const newsHtml = articles.map(article => `
        <div>
            <h3>${article.title}</h3>
            <p>${article.description || ""}</p>
            <a href="${article.link}">Read More</a>
        </div>
    `).join("");

    const transport = createSmileMailTransport();

    for (const subscriber of subscribers.recordset) {

        await transport.sendMail({
            from: `"SMILE Platform" <${process.env.LUCAS_EMAIL}>`,
            to: subscriber.Email,
            subject: "📰 SMILE Daily Newsletter",
            html: `
                <h1>SMILE Daily Newsletter</h1>
                ${newsHtml}
            `
        });

        console.log(`Newsletter sent to ${subscriber.Email}`);
    }
};