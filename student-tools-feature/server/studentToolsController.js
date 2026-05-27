const applications = [];
const vaultDocuments = [];
const forumPosts = [
  {
    id: "post-demo-1",
    author: "SMILE Team",
    title: "Share bursaries, study advice, and career questions here",
    category: "Announcement",
    body: "This is a student community space. Admin moderation can hide posts that are unsafe, spam, or unrelated.",
    status: "approved",
    createdAt: new Date().toISOString(),
  },
];

const opportunitySeed = [
  {
    id: "opp-1",
    title: "STEM Bursary Programme",
    province: "Gauteng",
    grade: "Grade 12",
    careerPath: "Engineering",
    reason: "Matches Mathematics, Physical Sciences, and Engineering interests.",
  },
  {
    id: "opp-2",
    title: "Youth Digital Skills Bootcamp",
    province: "National",
    grade: "Grade 11",
    careerPath: "Information Technology",
    reason: "Good match for students interested in coding, IT, or digital careers.",
  },
  {
    id: "opp-3",
    title: "Health Sciences Open Day",
    province: "Limpopo",
    grade: "Grade 12",
    careerPath: "Health Sciences",
    reason: "Relevant for Life Sciences and healthcare career interests.",
  },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCv(req, res) {
  const {
    fullName,
    email,
    phone,
    province,
    grade,
    careerGoal,
    subjects,
    skills,
    achievements,
    experience,
  } = req.body;

  if (!fullName || !careerGoal) {
    return res.status(400).json({ message: "Full name and career goal are required." });
  }

  const cv = `# ${fullName}

${email || "Email not provided"} | ${phone || "Phone not provided"} | ${province || "Province not provided"}

## Career Objective
Motivated ${grade || "student"} seeking opportunities that support growth toward ${careerGoal}. Interested in learning, gaining practical experience, and contributing positively to teams and communities.

## Education
Current Grade: ${grade || "Not specified"}
Key Subjects: ${subjects || "Not specified"}

## Skills
${formatLines(skills)}

## Achievements
${formatLines(achievements)}

## Experience and Activities
${formatLines(experience)}

## References
Available on request.`;

  res.json({
    cv,
    tips: [
      "Keep the CV to one page if you are still in school.",
      "Add proof for achievements where possible.",
      "Use a professional email address.",
      "Update the CV for each bursary, internship, or opportunity.",
    ],
  });
}

export function getApplications(req, res) {
  res.json({ applications });
}

export function createApplication(req, res) {
  const { title, organization, type, deadline, status, notes } = req.body;

  if (!title || !organization) {
    return res.status(400).json({ message: "Title and organization are required." });
  }

  const application = {
    id: createId("app"),
    title,
    organization,
    type: type || "Opportunity",
    deadline: deadline || null,
    status: status || "Not started",
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };

  applications.unshift(application);
  res.status(201).json({ application });
}

export function updateApplication(req, res) {
  const application = applications.find((item) => item.id === req.params.id);

  if (!application) {
    return res.status(404).json({ message: "Application not found." });
  }

  Object.assign(application, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });

  res.json({ application });
}

export function getVaultDocuments(req, res) {
  res.json({ documents: vaultDocuments });
}

export function createVaultDocument(req, res) {
  const { name, category, fileName, fileType, fileSize } = req.body;

  if (!name || !category) {
    return res.status(400).json({ message: "Document name and category are required." });
  }

  const document = {
    id: createId("doc"),
    name,
    category,
    fileName: fileName || "Not uploaded yet",
    fileType: fileType || "metadata",
    fileSize: fileSize || 0,
    status: "Stored",
    createdAt: new Date().toISOString(),
  };

  vaultDocuments.unshift(document);
  res.status(201).json({ document });
}

export function deleteVaultDocument(req, res) {
  const index = vaultDocuments.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "Document not found." });
  }

  vaultDocuments.splice(index, 1);
  res.json({ success: true });
}

export function getAlerts(req, res) {
  const { province = "National", grade = "Grade 12", careerPath = "" } = req.query;

  const alerts = opportunitySeed.filter((opportunity) => {
    const provinceMatch = opportunity.province === "National" || opportunity.province.toLowerCase() === String(province).toLowerCase();
    const gradeMatch = opportunity.grade === grade || grade === "";
    const careerMatch = !careerPath || opportunity.careerPath.toLowerCase().includes(String(careerPath).toLowerCase());
    return provinceMatch && gradeMatch && careerMatch;
  });

  res.json({ alerts });
}

export function getForumPosts(req, res) {
  res.json({
    posts: forumPosts.filter((post) => post.status !== "hidden"),
  });
}

export function createForumPost(req, res) {
  const { author, title, category, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: "Forum title and body are required." });
  }

  const post = {
    id: createId("post"),
    author: author || "Student",
    title,
    category: category || "General",
    body,
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  forumPosts.unshift(post);
  res.status(201).json({ post });
}

export function moderateForumPost(req, res) {
  const post = forumPosts.find((item) => item.id === req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Forum post not found." });
  }

  post.status = req.body.status === "hidden" ? "hidden" : "approved";
  post.moderationReason = req.body.reason || "";
  post.moderatedAt = new Date().toISOString();

  res.json({ post });
}

function formatLines(value) {
  if (!value) {
    return "- Not specified";
  }

  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}
