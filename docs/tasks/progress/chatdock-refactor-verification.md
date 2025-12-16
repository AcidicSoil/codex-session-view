# Chat Dock Refactor Verification Report — 2025-12-16

## Executive Summary
The Chat Dock has been refactored to support a unified "Sidebar + Main + Collateral" layout managed within `ChatDockPanel`. This consolidation simplifies `ViewerChatView` and prepares the architecture for advanced features like AI Settings, Rule Inventory, and Session Context management within the dock itself.

## Changes Implemented

### 1. Component Architecture
- **`ChatDockPanel`**: Promoted to the main controller of the chat view layout. Now renders a split view:
  - **Left (Main)**: Chat interaction (Header, Messages, Composer).
  - **Right (Sidebar)**: `ChatDockSidebar` (History) and `ChatDockCollateral` (Context/Settings).
- **`ChatDockCollateral`**: New component implementing:
  - **Session Context**: Reuses `SessionRepoSelector` for binding repo instructions.
  - **AI Configuration**: Panel for Temperature, Max Tokens, and Keep-Loaded toggle.
- **`ChatDockSidebar`**: Wraps `AIChatHistory` for thread management.
- **`ViewerChatView`**: Simplified to pass `assets` and handlers to `ChatDockPanel`, removing manual layout management of the sidebar.

### 2. Server Functions
- **`providerKeepAlive`**: Added stub server function to log keep-alive signals. This serves as the hook for future backend implementation of model persistence (e.g., preventing Ollama/LM Studio unloading).

### 3. State Management
- Integrated `useChatDockSettings` store into `ChatDockPanel` and `ChatDockCollateral` to persist AI preferences.

## Verification Checklist

### Manual Verification Required
Since automated tests cannot be executed in the current environment, the following manual checks are recommended:

- [ ] **Layout**: Verify `ChatDockPanel` renders the split layout correctly on large screens and stacks on smaller screens (responsive check).
- [ ] **History**: Verify "New Chat", "Clear Chat", and thread switching works via the new `ChatDockSidebar` integration.
- [ ] **Settings**: Toggle "Keep model loaded" and verify `providerKeepAlive` is called (via network tab or logs). Adjust sliders and ensure state persists.
- [ ] **Context Binding**: Use the "Instruction Source" selector in the collateral panel to bind a repo. Verify that `onRepoContextChange` is triggered and rules are loaded.
- [ ] **Legacy Cleanup**: Confirm `AIChatHistory` is no longer rendered twice (it should only be in the sidebar).

### Automated Tests Status
- **`tests/ChatDockPanel.test.tsx`**: Unit tests were reviewed. Existing tests for "New chat" and message submission should pass as the component structure preserves these interactive elements.
- **Coverage**: New components (`ChatDockCollateral`) need dedicated test coverage in future iterations.

## Outstanding Risks / Next Steps
1.  **`providerKeepAlive` Implementation**: Currently a log-only stub. Needs actual integration with the Model Provider API (e.g., `ollama` or `lm-studio` keep-alive endpoints).
2.  **Rule Inventory Integration**: `SessionRuleSheet` is currently accessible via the global "Review rules" drawer in `ViewerWorkspaceChrome`. We may want to integrate a summary or toggle directly into `ChatDockCollateral` in the future.
3.  **Responsiveness**: The grid layout in `ChatDockPanel` uses `minmax(300px, 340px)` for the sidebar. Ensure this doesn't squeeze the main chat too much on medium screens (1024px).

## Conclusion
The refactor achieves the structural goals set out in the Chat Dock Follow-Up plan. The code is modular and ready for the next phase of feature deepening (e.g., advanced telemetry, model specific keep-alive logic).
