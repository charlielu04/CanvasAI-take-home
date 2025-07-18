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

This script leverages Stagehand and Browserbase to automate the extraction of business information from Better Business Bureau (BBB) search result pages.

The scraper:

- Visits multiple pages of BBB search results (defaulting to pages 1-15).
- Extracts detailed information for each listed business by visiting their respective BBB profile pages.
- Collects the following details:
  - **Business Name**
  - **Address**
  - **Phone Number**
  - **Primary Contact** (if available)
  - **BBB Accreditation Status**
  - **Profile URL**
- Filters out duplicates based on **Business Name** and **Phone Number**.
- Exports the collected data to a CSV file (`medical_billing_companies.csv`).

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
1. Create a .env.local file in `take-home` with the following contents:
```env
SUPABASE_URL=https://bpfvweovqyvylazoddly.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZnZ3ZW92cXl2eWxhem9kZGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDEzMDIsImV4cCI6MjA2ODIxNzMwMn0.snR1ibPAeBLJo6XSVhBL8yregAsl8l4DpsqjJVqLvkk
```

2. Make sure you are in `\take-home` and then run the app by: 
```bash
   npm run dev
   ```
3. Go to http://localhost:3000 and submit a BBB base URL (like https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=) to test it