# Integration Notes

These steps show how to connect the student tools feature later.

## 1. Copy Frontend Files

Recommended destinations:

```text
src/frontEnd/htmlPages/student-tools.html
src/frontEnd/htmlPages/cv-builder.html
src/frontEnd/htmlPages/applications.html
src/frontEnd/htmlPages/document-vault.html
src/frontEnd/htmlPages/opportunity-alerts.html
src/frontEnd/htmlPages/community-forum.html
src/frontEnd/css/studentTools.css
src/frontEnd/jsFrontEnd/studentTools.js
```

Update the HTML paths:

```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/studentTools.css">
<script src="/jsFrontEnd/studentTools.js" defer></script>
```

## 2. Copy Server Files

Recommended destinations:

```text
src/server/routes/studentToolsRoutes.js
src/server/controllers/studentToolsController.js
```

Then in `src/server/main.js`:

```js
import studentToolsRoutes from "./routes/studentToolsRoutes.js";

app.use("/", studentToolsRoutes);
```

## 3. Protect Student Routes

When integrating, add your existing `verifyToken` middleware to routes that should only be used by logged-in students.

Example:

```js
route.get("/student/tools", verifyToken, studentToolsPage);
route.post("/api/student-tools/cv", verifyToken, createCv);
```

## 4. Add Dashboard Link

Add a student dashboard button:

```html
<a href="/student/tools" class="btn btn--primary">Student Tools</a>
```

## 5. Replace In-Memory Data

The controller currently stores data in arrays. Replace them with SQL queries using your existing database connection.

## 6. Optional AI CV Generation

The CV builder currently generates a strong template. You can upgrade it to use your existing Groq setup by sending the form data to an AI model and saving the final CV in the database.
