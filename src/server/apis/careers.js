import https from "https";
import dotenv from "dotenv";

dotenv.config();

export const fetchJobs = (req, res) => {
  const category = req.query.category || "technology";

  const CAREER_MAP = {
    technology: "software developer",
    healthcare: "nurse",
    engineering: "civil engineer",
    business: "accountant",
    creative: "graphic designer",
    education: "teacher",
    law: "lawyer"
  };

  const query = CAREER_MAP[category] || "jobs";

  const url = `https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=${process.env.ADZUNA_ID}&app_key=${process.env.ADZUNA_KEY}&what=${encodeURIComponent(query)}`;

  https.get(url, (apiRes) => {
    let data = "";

    apiRes.on("data", chunk => data += chunk);

    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);

        const jobs = (parsed.results || []).map(job => ({
          title: job.title,
          company: job.company.display_name,
          location: job.location.display_name,
          salary: job.salary_min && job.salary_max
            ? `R${job.salary_min} - R${job.salary_max}`
            : "Not specified",
          url: job.redirect_url
        }));

        res.json({ success: true, jobs });

      } catch (err) {
        res.status(500).json({ success: false, message: "Parse error" });
      }
    });

  }).on("error", err => {
    res.status(500).json({ success: false, message: err.message });
  });
};