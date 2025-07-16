# BBB Medical Billing Scraper

## Search URL

`https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=1`  
This URL lists A-rated BBB businesses in the "Medical Billing" category across the U.S. The scraper loops through pages 1–15 of this search.

---

## Method Overview

This project uses Python and [Playwright](https://playwright.dev/python/) to programmatically extract business information from the BBB website.

- The script launches a Chromium browser using Playwright.
- For each of the first 15 pages of search results, it:
  - Collects all business listing links.
  - Visits each individual business profile page.
  - Extracts the following fields:
    - Business name
    - Phone number (with fallback to alternate phone, formatted as `+1XXXXXXXXXX`)
    - Street address
    - Principal contact(s)
    - Accreditation status
    - Business URL
- The script deduplicates entries based on business name and phone number (If a business has the same name and number, it is considered the same).
- Results are saved to `medical_billing_companies.csv`.

---

## Reproduction Instructions

1. **Clone the repository** (or copy the files into a folder).
2. **Create and activate a Python environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install playwright rich
   playwright install chromium
   ```
4. **Run the scraper**:
   ```bash
   python scraper.py <base_url>
   ```
   Example: 
   ```bash
   python scraper.py "https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page="
   ```
   (Notice how there is no page specified)
5. The output will be saved as `medical_billing_companies.csv`.

---

## Issues Encountered

- There are businesses that are the same but have individual listings for each location. Only the first business location is included in the csv.
- Some business listings were missing phone numbers, so the script attempts to use fallback numbers when available.
- Principal contacts sometimes return multiple people. The script handles this as a comma-separated string.
- With headerless=True, I was unable to scrape anything. Had to disugise myself as a normal user with context resembling a normal user.
