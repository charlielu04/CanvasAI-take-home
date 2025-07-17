from playwright.sync_api import sync_playwright, Playwright
# from rich import print
import re
import csv
import sys
import json
import html

# name
# phone (formatted as +14155551234)
# principal_contact
# url
# street address (if available)
# accreditation status (if available)


def clean(text):
    return (
        html.escape(text)
        .replace("\n", " ")
        .replace("\r", " ")
        .replace("\t", " ")
        .strip()
    )
def get_phone(p):
    # sometimes phone number is not in the main section but in the "other" section
    main_phone_locator = p.locator("div.bpr-header-contact a[href^='tel:']")
    if main_phone_locator.count() > 0:
        return normalize_phone(main_phone_locator.first.inner_text())

    details = p.locator("div.bpr-details-dl-data[data-type='on-separate-lines']")
    for i in range(details.count()):
        dt = details.nth(i).locator("dt").inner_text().strip()
        if dt == "Additional Phone Numbers":
            phone_link = details.nth(i).locator("dd a.dtm-phone")
            if phone_link.count() > 0:
                return normalize_phone(phone_link.first.inner_text())
    return "N/A"

# get phone number to desired format
def normalize_phone(phone):
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return phone


def run(playwright: Playwright, base_url: str):
    seen = set()
    results = []

    for i in range(1, 2):
        start_url = f"{base_url}{i}"

        chrome = playwright.chromium
        browser = chrome.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            java_script_enabled=True,
            locale="en-US"
        )

        page = context.new_page()
        page.goto(start_url)

        businesses = page.locator("h3.result-business-name")
        for i in range(businesses.count()):
            h3 = businesses.nth(i)
            a_tag = h3.locator("a.text-blue-medium")

            name = a_tag.inner_text()
            relative_url = a_tag.get_attribute("href")
            full_url = f"https://www.bbb.org{relative_url}"

            # open a new page for each business
            p = context.new_page()
            p.goto(full_url)

            # Extract phone number
            phone = get_phone(p)

            # Extract address
            address_locator = p.locator("div.bpr-overview-address p.bds-body")
            address_lines = []
            for i in range(address_locator.count()):
                address_lines.append(address_locator.nth(i).inner_text().strip())
            address = ", ".join(address_lines) if address_lines else "N/A"

            # Extract principal contact
            details = p.locator(
                "div.bpr-details-dl-data[data-type='on-separate-lines']"
            )
            principal_contact = "N/A"
            for i in range(details.count()):
                dt = details.nth(i).locator("dt").inner_text().strip()
                if dt == "Principal Contacts":
                    dd_locator = details.nth(i).locator("dd")
                    dd_count = dd_locator.count()
                    dd_texts = [
                        dd_locator.nth(j).inner_text().strip() for j in range(dd_count)
                    ]
                    principal_contact = ", ".join(dd_texts) if dd_texts else "N/A"
                    break

            # Extract accreditation
            accreditation_status = False
            if p.locator("h3.bpr-accreditation-title").count() > 0:
                text = (
                    p.locator("h3.bpr-accreditation-title").first.inner_text().strip()
                )
                if "is BBB Accredited" in text:
                    accreditation_status = True

            # print(f"{name} | {full_url} | Phone: {phone} | Address: {address} | Principal Contact: {principal_contact} | Accredited: {accreditation_status}")
            if (name, phone) in seen:
                p.close()
                continue
            seen.add((name, phone))
            results.append(
                {
                    "name": clean(name),
                    "url": clean(full_url),
                    "phone": clean(phone),
                    "address": clean(address),
                    "principal_contact": clean(principal_contact),
                    "accredited": accreditation_status,
                }
            )

            p.close()

        page.close()

    output_filename = "medical_billing_companies.csv"
    fieldnames = ["name", "phone", "principal_contact", "url", "address", "accredited"]

    with open(output_filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow(row)
    try:
        safe_json = json.dumps(results, ensure_ascii=False)
        sys.stdout.write(safe_json)
    except Exception as e:
        print(f"ERROR: Failed to serialize JSON: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("[red]Usage:[/] python scraper.py <BBB Search URL>")
        sys.exit(1)

    base_url = sys.argv[1]
    with sync_playwright() as playwright:
        run(playwright, base_url)