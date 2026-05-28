# SMILE Student Tools Feature Pack

This folder contains separate starter features for:

- AI CV Builder
- Application Tracker
- Document Vault
- Opportunity Alerts
- Community Forum

The feature pack is not connected to the main SMILE project yet. It is designed to match the current SMILE dashboard style and can be moved into the main app later.

## Files

- `frontEnd/student-tools.html` - tools landing page.
- `frontEnd/cv-builder.html` - AI CV Builder page.
- `frontEnd/applications.html` - Application Tracker page.
- `frontEnd/document-vault.html` - Document Vault page.
- `frontEnd/opportunity-alerts.html` - Opportunity Alerts page.
- `frontEnd/community-forum.html` - Community Forum page.
- `frontEnd/studentTools.css` - SMILE-style UI for the feature pack.
- `frontEnd/studentTools.js` - frontend logic for forms, lists, alerts, and forum interactions.
- `server/studentToolsRoutes.js` - Express routes for serving the page and APIs.
- `server/studentToolsController.js` - starter backend logic using in-memory data.
- `integration-notes.md` - instructions for connecting the feature later.

## Current Behavior

This version uses in-memory storage so it is safe for testing. Data resets when the server restarts.

When connecting to production, replace the in-memory arrays with SQL tables.

## Recommended Database Tables Later

- `StudentCVs`
- `StudentApplications`
- `StudentDocuments`
- `StudentOpportunityAlerts`
- `ForumPosts`
- `ForumComments`
- `ForumModerationActions`
