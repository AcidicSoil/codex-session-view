from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:4173"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_selector('[data-testid="viewer-hero-title"]', timeout=10_000)
        browser.close()


if __name__ == "__main__":
    main()
