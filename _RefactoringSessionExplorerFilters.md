***

**Ticket: UX Refactor - Session Explorer Filtering & Sorting**

**Context**
On the **Session Explorer** page, the current filtering and sorting interface is cluttered and confusing. We currently present three different UI patterns—the "All/Recent/Large" toggle, the Sort dropdown, and the "Advanced" range inputs—that conflict with one another and compete for the same screen real estate.

**The Issue**
The current experience forces the user to navigate redundant controls to achieve simple tasks.

* **Redundant Toggles:** The "All | Recent | Large" buttons are effectively just "Sort" presets, but they are presented as separate view modes, which is misleading.
* **Useless Expansion:** The "Advanced" button simply expands the layout to show size/timestamp ranges, pushing content down unnecessarily.
* **Confusing Hierarchy:** The Timestamp dropdown creates friction by overlapping with the logic of the other filters.

**The Requirement**
We need to move to a cleaner, "Single Source of Truth" model for this page.

**1. UI/UX Changes**

* **Remove the "All | Recent | Large" Toggle:** Please deprecate these buttons entirely to clear the visual noise.
* **Unified Sorting:** The existing dropdown should become the sole owner of sorting logic. It needs to handle `Timestamp`, `Size`, and potentially `Duration` or `Name` clearly.
* **Consolidate Filters:** Remove the "Advanced" accordion. Instead, place the **Size Range** and **Timestamp Range** inputs inside a single "Filters" button that opens a popover or modal. This will keep the initial view clean and scannable.

**2. Backend/API Standardization**
To support this UI cleanup, the frontend needs to send a standardized request payload.

* **Deprecate Presets:** The API should no longer rely on specific endpoints or logic for "presets" like 'Large'.
* **Standardize Payload:** Please update the `/api/sessions/search` endpoint to accept a consistent `sort` object (field/direction) and a `filters` object (ranges). This separates the business logic from the UI and allows us to easily scale (e.g., adding "Repo Name" filters later) without redesigning the interface.

**Definition of Done**

* The "All/Recent/Large" buttons are removed.
* Users can sort by Timestamp/Size via a single dropdown.
* Users can filter by specific ranges via a "Filters" popover.
* The API accepts the standardized `sort` and `filter` JSON structure.
