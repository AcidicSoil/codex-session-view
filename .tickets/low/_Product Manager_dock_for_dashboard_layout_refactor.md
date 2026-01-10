
### **UI Change Request: Navigation Redesign - Switch to Bottom Dock**

**1. Context**
The current "Session Intelligence Viewer" uses a grid of large cards at the top of the workspace to handle primary navigation (Explorer, Inspector, Chat, etc.).

**2. The Issue**
The card-based dashboard layout creates visual clutter and consumes significant screen real estate. This scatters navigation controls across the content area, forcing users to scan the upper section of the page rather than having a consistent, accessible anchor for navigation. We are moving away from this scattered layout.

**3. The Requirement**
Please deprecate the current card grid and move these navigation items into a unified **Dock** component.

* **Placement:** The dock must stick to the bottom of the application viewport and remain **always in view** to ensure instant access to navigation regardless of scroll position.
* **Behavior:** The visual style and interaction model should match the "Dock" component specified in the design reference (Magic UI).
* **Goal:** Streamline the interface to prioritize the workspace content while keeping navigation tools handy.

**Reference:** [Magic UI Dock Documentation](https://magicui.design/docs/components/dock)

---

**Next Step:** Would you like me to outline specifically which icons or labels should be used for each item in the new dock?

---

# You Asked

Yes proceed with that

# Gemini Responded

### **UI Change Request: Dock Item Specification**

**1. Context**
Following the decision to replace the top-level card grid with a persistent bottom **Dock**, we need to define the specific items, labels, and iconography to ensure a clean transition.

**2. The Requirement**
The Dock should contain the following navigation items, mapped from the existing dashboard cards. Please use standard icon equivalents (e.g., Lucide or Heroicons) that align with our design system.

| Current Card / Feature | Dock Label | Suggested Icon | Behavior |
| :--- | :--- | :--- | :--- |
| **Explorer** ("Browse cached sessions") | `Explorer` | **FolderSearch** or **Compass** | Navigates to the session browser/list view. |
| **Inspector** ("Timeline, uploads...") | `Inspector` | **Activity** or **Terminal** | Opens the event timeline and debug view. |
| **Chat** ("Session coach...") | `Chat` | **MessageSquare** or **Sparkles** | Opens the AI session coach interface. |
| **Review Rules** | `Rules` | **ClipboardCheck** or **Shield** | Opens the rules review modal or page. |
| *(New Item)* | `Home` | **Home** or **Grid** | Resets view to the main dashboard summary. |

**3. Visual Details**

* **Tooltips:** Display the "Dock Label" on hover (as seen in the Magic UI reference).
* **Active State:** The icon for the currently active view must be visually distinct (e.g., highlighted background or distinct color).
* **Position:** Centered at the bottom of the viewport.

---

**Next Step:** Would you like me to draft the ticket for the **mobile responsiveness** of this dock, or should we focus on the specific interactions (like animations) next?

---
