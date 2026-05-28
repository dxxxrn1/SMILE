# Student Document Scanner Feature

This folder is a self-contained starter feature for scanning a student document from a phone, sending it back to the website, checking whether it is a school document, and preparing career recommendations for the chatbot.

It is intentionally separate from the current SMILE app so you can test and adjust it before wiring it into `src/server/main.js`. It uses only the packages already in your project.

## What It Does

1. The desktop page creates a scan session.
2. The website displays a QR code and mobile scan URL.
3. The student opens the URL on a phone.
4. The phone camera captures/uploads the document.
5. The desktop page detects the upload automatically.
6. The backend checks if the uploaded document looks like a school report, transcript, certificate, or academic results document.
7. If valid, it returns a career recommendation draft that can be passed into your existing chatbot.

## Files

- `server/documentScannerRoutes.js` - Express routes for scan sessions, uploads, document checking, and career recommendation.
- `frontEnd/scan-desktop.html` - Desktop page that shows the QR code and waits for the phone upload.
- `frontEnd/scan-mobile.html` - Mobile camera upload page.
- `frontEnd/documentScanner.css` - Styling for both pages.
- `frontEnd/documentScannerDesktop.js` - Desktop session and status logic.
- `frontEnd/documentScannerMobile.js` - Phone upload logic.
- `integration-notes.md` - How to connect this folder to the main SMILE project.

## Current Limitation

This starter version uses simple text/pattern detection to prove the flow. For production, replace the mock text extraction with OCR such as:

- Azure Document Intelligence
- Google Cloud Vision
- AWS Textract
- OpenAI vision model
- Tesseract OCR

The route already keeps the OCR step isolated so it can be replaced later.
