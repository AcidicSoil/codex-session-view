from playwright.sync_api import sync_playwright

def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://127.0.0.1:5173')
        page.wait_for_load_state('networkidle')

        page.get_by_test_id('viewer-hero-title').wait_for(timeout=10_000)
        page.get_by_role('heading', name='API Test').wait_for(timeout=10_000)

        browser.close()


if __name__ == '__main__':
    main()
