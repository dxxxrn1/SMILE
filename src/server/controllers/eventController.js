import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsFilePath = path.join(__dirname, "..", "utils", "events.json");

// Helper function to safely read events
const readEvents = () => {
    try {
        if (!fs.existsSync(eventsFilePath)) {
            return [];
        }
        const data = fs.readFileSync(eventsFilePath, "utf8");
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Error reading events file:", err);
        return [];
    }
};

// Helper function to safely write events
const writeEvents = (events) => {
    try {
        fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2), "utf8");
        return true;
    } catch (err) {
        console.error("Error writing events file:", err);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/events/upcoming
// Retrieves upcoming events from today onwards (sorted chronologically)
// ─────────────────────────────────────────────────────────────────
export const getUpcomingEvents = async (req, res) => {
    try {
        const events = readEvents();
        
        // Get today's date formatted as YYYY-MM-DD (local time)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Filter events that happen from today onwards
        const upcomingEvents = events.filter(e => {
            return e.EventDate >= todayStr;
        });

        // Sort chronologically by date and start time
        upcomingEvents.sort((a, b) => {
            if (a.EventDate !== b.EventDate) {
                return a.EventDate.localeCompare(b.EventDate);
            }
            const timeA = a.StartTime || "00:00";
            const timeB = b.StartTime || "00:00";
            return timeA.localeCompare(timeB);
        });

        return res.status(200).json({ success: true, events: upcomingEvents });
    } catch (err) {
        console.error("getUpcomingEvents error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch upcoming schedule." });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/events/create
// Creates a new event linked to the active Organization
// ─────────────────────────────────────────────────────────────────
export const createEvent = async (req, res) => {
    try {
        const { title, category, eventDate, startTime, endTime, eventLocation, description } = req.body;

        if (!title || !category || !eventDate) {
            return res.status(400).json({ success: false, message: "Title, category, and date are required." });
        }

        // Get active OrgId from verifyToken payload
        const orgId = req.user && req.user.id ? req.user.id : null;

        const events = readEvents();

        // Generate a new unique EventID
        const nextId = events.reduce((max, e) => (e.EventID > max ? e.EventID : max), 0) + 1;

        const newEvent = {
            EventID: nextId,
            OrgId: orgId,
            Title: title.trim(),
            Category: category.toLowerCase().trim(),
            EventDate: eventDate, // 'YYYY-MM-DD'
            StartTime: startTime ? startTime.trim() : null, // 'HH:MM'
            EndTime: endTime ? endTime.trim() : null, // 'HH:MM'
            EventLocation: eventLocation ? eventLocation.trim() : "SMILE Hub",
            Description: description ? description.trim() : "SMILE Initiative Track"
        };

        events.push(newEvent);
        const success = writeEvents(events);

        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to save the new event." });
        }

        console.log(`✅ Event #${nextId} "${newEvent.Title}" created by Org #${orgId}`);
        return res.status(201).json({ success: true, message: "Event created successfully!", event: newEvent });
    } catch (err) {
        console.error("createEvent error:", err);
        return res.status(500).json({ success: false, message: "Failed to create event." });
    }
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/events/:id
// Deletes a scheduled event (only if owned by the organization)
// ─────────────────────────────────────────────────────────────────
export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user && req.user.id ? req.user.id : null;

        if (!orgId) {
            return res.status(401).json({ success: false, message: "Unauthorized. Organisation login required." });
        }

        const events = readEvents();
        const eventIdNum = parseInt(id, 10);
        
        const eventIndex = events.findIndex(e => e.EventID === eventIdNum);

        if (eventIndex === -1) {
            return res.status(404).json({ success: false, message: "Event not found." });
        }

        const targetEvent = events[eventIndex];

        // Ensure organisation owns this event (or allow admin override if necessary)
        if (targetEvent.OrgId !== orgId && req.user.accountType !== "admin") {
            return res.status(403).json({ success: false, message: "Unauthorized. You can only delete your own events." });
        }

        events.splice(eventIndex, 1);
        const success = writeEvents(events);

        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to delete the event from disk." });
        }

        console.log(`✅ Event #${eventIdNum} deleted by Org #${orgId}`);
        return res.status(200).json({ success: true, message: "Event deleted successfully." });
    } catch (err) {
        console.error("deleteEvent error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete event." });
    }
};
