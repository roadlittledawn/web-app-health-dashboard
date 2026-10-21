---
name: health-log-checkin
description: Walk through the user's active health incidents one at a time and add a health log update to each using the health-dashboard MCP. Use when the user says things like "log health updates", "check in on my incidents", "add health log entries", "update my active incidents", or "how are my injuries doing — let's log it".
---

# Health log check-in

Go through each active health incident with the user, one at a time. For each one, get an update from them, rewrite it as a concise clinical note, confirm it, and save it as a health log entry.

## 1. Get the current date and time

Run `date "+%Y-%m-%d %H:%M %Z (%A)"`. Use the result as the timestamp for every entry (ISO with offset, e.g. `2026-10-21T08:15:00-07:00`). Mention it to the user once.

## 2. Find active incidents

There is **no `active` status**. Incident `status` is an array, and these values are in use: `constant`, `improving`, `worsening`, `occasional`, `resolved`.

- Call `query_incidents` with no status filter, `sort_order: "desc"`, and page with `skip` until you have all `pagination.total` incidents.
- Treat every incident whose `status` doesn't include `resolved` as active.
- Don't use `endDate` to decide: many resolved incidents have `endDate: null`.
- Point out inconsistent records, such as an `endDate` set while status isn't `resolved`.

List the active incidents in a short table (name/`incidentId`, started, status, intensity, a one-line summary), then start with the first one, or whichever one the user picks.

## 3. For each incident

1. **Check history.** Call `query_health_logs` with `incident_id` set to the incident's `_id` (not `incidentId`) and `sort_order: "desc"`, so your questions build on the last entry.
2. **Ask for an update.** Ask 3–6 targeted questions based on the incident:
   - Pain level (0–10) compared to onset or the last entry
   - How it held up during activity or work
   - What makes it worse or better, and treatments tried
   - New symptoms, plus incident-specific ones (e.g. palpitations or watch alerts for heart; recent labs for lab-based incidents)
   - Whether it's resolved
3. **Draft the entry.** Rewrite what the user said in the voice of a doctor's progress note: short, clinical, third person with no subject ("Pain down to 2/10 from 6/10 at onset."). Keep specific numbers, dates, and triggers; cut filler. Keep it to 2–5 sentences. Don't add facts the user didn't give.
4. **Confirm.** Show the draft as a blockquote with the incident, type (`update`, or `doctor_visit_notes` for a medical appointment), and timestamp. Ask the user to approve it or ask for changes. If the user said to "just add" something, enter it without a confirmation round, and show the final text afterward.
5. **Enter it** with `create_health_log` (`incident_id`, `issue_type`, `description`, `timestamp`).
6. Move to the next incident.

## 4. Incident-level changes (current MCP gap)

The MCP has **no `update_incident` tool** (tracked in roadlittledawn/web-app-health-dashboard#92). That means you can't:
- change `status` (e.g. to `resolved` or `improving`)
- set or clear `endDate`
- add a point to `painIntensityOverTime`

When an update calls for one of these, say so and tell the user to make the change in the web app (`/incidents/edit/[id]`). If an `update_incident` tool or a pain-intensity tool has been added since this was written, check for it with ToolSearch (`+health-dashboard incident`) and use it after confirming with the user.

## 5. Wrap up

Briefly list what you logged for each incident, plus any manual follow-ups (status changes, data issues, things worth raising with a doctor, recurring symptoms that might deserve their own incident).

## Tone

These are personal health records. Be matter-of-fact and brief, and don't lecture. If something looks medically significant (e.g. an AFib alert, chest pain, a sudden severe change), suggest once that the user follow up with their doctor.
