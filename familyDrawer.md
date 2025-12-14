### **Feature Request: Refactor Session Explorer with Drawers (Cult UI)**

**1. Context**
The issue remains on the "Session Explorer" dashboard. We are addressing the "visual blockade" caused by the static Upload container and the expanded Filter panel.

**2. The Issue (UX Debt)**

* **Vertical Blockade:** The "Upload & Stream" box is a permanent fixture that separates the Filters (Cause) from the Data List (Effect). It wastes over 200px of vertical space for an occasional action.
* **Cognitive Overload:** The expanded filter panel displays too many controls at once (violating Hick’s Law), overwhelming the user and pushing the actual session data below the fold.
* **Poor Spatial Logic:** The primary data list is visually disconnected from the search bar due to these intervening elements.

**3. The Requirement (Implementation Plan)**
We need to refactor the layout to implement "Spatial Logic" using **Cult UI components**.

* **Zone A (Navigation):**
  * **Upload:** Remove the static "Drop session exports" box. Replace it with a **Primary Button** ("Upload Session") in the top-right. This button must trigger the **FamilyDrawer (File Upload Flow)** component (modal mode with scrim).
  * **Filters:** Remove the expanded filter row. Replace it with a **Secondary Button** ("Filters") that triggers a **Custom View Drawer** (Composable Pattern) for toggling status/tags.
* **Zone B (Data):**
  * **Proximity:** The Session List must move up to sit flush against the Search Bar/Header.
* **Zone C (Interaction):**
  * Uploads and complex filtering must happen in the overlay (Drawer), keeping the main dashboard focused purely on reading data.

---

[FamilyDrawer-Examples](https://www.cult-ui.com/docs/components/family-drawer)

* composable

* file upload

* custom view via props

---
