import { sendNewsletterToSubscribersJob } from "./newsletterJob.js";

export const sendNewsletterToSubscribers = async (req, res) => {
    try {

        await sendNewsletterToSubscribersJob();

        return res.status(200).json({
            success: true,
            message: "Newsletter sent successfully."
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Newsletter sending failed."
        });
    }
};