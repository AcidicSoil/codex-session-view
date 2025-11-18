import { StartClient } from "@tanstack/react-start/client"
import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { logError, logInfo } from "~/lib/logger"

if (typeof window !== "undefined") {
    const globalKey = "__codex_global_log_handlers__"
    const win = window as typeof window & { [globalKey]?: boolean }
    if (!win[globalKey]) {
        win[globalKey] = true
        window.addEventListener("error", (event) => {
            logError("runtime", `Unhandled window error: ${event.message}`, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
            })
        })
        window.addEventListener("unhandledrejection", (event) => {
            logError("runtime", "Unhandled promise rejection", { reason: event.reason })
        })
        logInfo("runtime", "Global runtime error listeners attached")
    }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
    void import("virtual:browser-echo")
}

startTransition(() => {
    hydrateRoot(
        document,
        (
            <StrictMode>
                <StartClient />
            </StrictMode>
        )
    )
})
