# Integration Notes

These steps show how to connect the feature later without changing its core logic.

## 1. Copy The Static Files Into The Existing Frontend

Recommended destination:

```text
src/frontEnd/htmlPages/scan-desktop.html
src/frontEnd/htmlPages/scan-mobile.html
src/frontEnd/css/documentScanner.css
src/frontEnd/jsFrontEnd/documentScannerDesktop.js
src/frontEnd/jsFrontEnd/documentScannerMobile.js
```

Then update the paths inside the two HTML files:

```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/documentScanner.css">
<script src="/jsFrontEnd/documentScannerDesktop.js" defer></script>
```

and:

```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/documentScanner.css">
<script src="/jsFrontEnd/documentScannerMobile.js" defer></script>
```

## 2. Add The Routes To Your Existing Server

Copy:

```text
student-document-scanner-feature/server/documentScannerRoutes.js
```

to:

```text
src/server/routes/documentScannerRoutes.js
```

Then in `src/server/main.js`, add:

```js
import documentScannerRoutes from "./routes/documentScannerRoutes.js";
```

and below your existing route setup:

```js
app.use("/", documentScannerRoutes);
```

## 3. Add A Button From Student Dashboard

On the student dashboard, add a button or link:

```html
<a href="/scanner/desktop" class="btn">Scan School Document</a>
```

Then add this route in `documentScannerRoutes.js` or your page controller:

```js
router.get("/scanner/desktop", (req, res) => {
  res.sendFile(path.join(scannerRoot, "frontEnd", "scan-desktop.html"));
});
```

## 4. Replace Mock OCR

The function to replace is:

```js
extractTextFromUploadedDocument()
```

In production, it should:

1. Read the uploaded image/PDF.
2. Send it to OCR.
3. Return extracted text.
4. Let `classifySchoolDocument()` decide whether it is a school document.

## 5. Connect To The Existing Chatbot

Your current chatbot lives in:

```text
src/server/controllers/chatbotController.js
```

After scanning, send the extracted structured result into the chatbot prompt. For example:

```js
const scanContext = `
Student scanned document:
Document Type: ${analysis.documentType}
Grade: ${analysis.grade}
Subjects and marks:
${analysis.subjects.map((s) => `${s.name}: ${s.mark}`).join("\n")}
`;
```

Then add that text to the career chatbot system or user message before generating advice.
