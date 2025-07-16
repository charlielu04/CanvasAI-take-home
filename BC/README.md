# Part B:
# Stagehand Automation Module

## Prompt Format

```json
{
  "url": "https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page="
}
```

This prompt represents the base search URL from the BBB site. The Stagehand module appends page numbers 1 through 15 to this base URL and runs the Playwright-based scraper on each.

---

## Method Overview

This project wraps the scraper into a Stagehand-compatible module using Node.js.

- The file `module.js` is located in `src/stagehand/` and serves as the entrypoint for Stagehand.
- When invoked, the module:
  - Accepts a `url` parameter.
  - Runs the Python scraper (`scraper.py`) via `child_process.exec`.
  - The Python scraper:
    - Loops over pages 1–15 of the BBB search.
    - Extracts fields from individual business profiles:
      - Business name  
      - Phone number (formatted as `+1XXXXXXXXXX`)  
      - Street address  
      - Principal contact(s)  
      - Accreditation status  
      - Business URL
    - Deduplicates entries by business name + phone number.
    - Saves results to `medical_billing_companies.csv`.
    - Also prints valid JSON directly to stdout for use by Stagehand.
  - The Node module:
    - Parses this JSON and returns it as `json`.
    - Also reads and returns the CSV output as a string.

---

## Reproduction Instructions

  First install all dependencies:
  ```bash
   cd \take-home && npm install
   ```
   Then:

   ```bash
   cd \src\scripts && node run_stagehand.js "<base_url>"
   ```


---

## Output Structure

Returns an object like:

```json
{
  "json": [
    {
      "name": "Company Name",
      "phone": "+14155551234",
      "principal_contact": "Jane Doe",
      "url": "https://www.bbb.org/profile/...",
      "address": "123 Main St, Anytown, NY",
      "accredited": true
    }
  ],
  "csv": "CSV content as a string"
}
```

---

## Issues Encountered

- JSON parsing failed initially due to control characters in raw business fields. This was fixed by sanitizing all fields before output.


# Part C


This project adds Supabase database functionality to the existing BBB business scraper. It allows scraped search results to be stored and retrieved from a PostgreSQL database through Supabase.

## Features

- Accepts a BBB search URL from the user
- Uses a Python Playwright-based scraper to extract business listings
- Inserts the search URL (if new) and the associated businesses into Supabase
- Prevents duplicate entries using `upsert` logic
- Returns the full set of businesses for that search URL

## Database Schema

Supabase is used to persist data with the following schema:

### `search_urls`

| Column       | Type      | Notes                        |
|--------------|-----------|------------------------------|
| `id`         | `uuid`    | Primary key (auto-generated) |
| `url`        | `text`    | Unique search URL            |
| `created_at` | `timestamp with time zone` | Default to `now()` |

### `results`

| Column             | Type      | Notes                                  |
|--------------------|-----------|----------------------------------------|
| `id`               | `uuid`    | Primary key                            |
| `search_url_id`    | `uuid`    | Foreign key → `search_urls.id`         |
| `name`             | `text`    | Business name                          |
| `phone`            | `text`    | Contact phone number                   |
| `url`              | `text`    | BBB profile link                       |
| `address`          | `text`    | Business address                       |
| `principal_contact`| `text`    | Contact person                         |
| `accredited`       | `boolean` | BBB accreditation status               |
| `created_at`       | `timestamp with time zone` | Default to `now()` |

## How It Works

1. A user submits a BBB search URL via the frontend.
2. The `/api/scrape` API route triggers the Python scraper (via Stagehand).
3. The script returns structured JSON data of all businesses.
4. The backend:
   - Inserts the URL into `search_urls` (if new)
   - Inserts or updates businesses into `results`
   - Returns all results linked to that URL
5. The frontend then renders a table of the resulting query

## How to run
1. Create a .env.local file in take-home with the following contents:
```env
SUPABASE_URL=https://bpfvweovqyvylazoddly.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZnZ3ZW92cXl2eWxhem9kZGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDEzMDIsImV4cCI6MjA2ODIxNzMwMn0.snR1ibPAeBLJo6XSVhBL8yregAsl8l4DpsqjJVqLvkk
```

2. Run the app by running 
```bash
   npm run dev
   ```
3. Go to http://localhost:3000 and submit a BBB base URL (like https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=) to test it