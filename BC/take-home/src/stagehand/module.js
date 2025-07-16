import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export const scrape = {
  description: "Scrape BBB data",
  parameters: {
    url: {
      type: "string",
      description: "Base BBB URL",
    },
  },
  async run({ url }) {
    if (!url) return { error: "Missing URL" };

    try {
      const { stdout } = await execAsync(`python src/scripts/scraper.py "${url}"`);
      console.log("SCRAPER STDOUT:", stdout);
      const json = JSON.parse(stdout);
      const csv = fs.readFileSync("medical_billing_companies.csv", "utf-8");

      return { json, csv };
    } catch (err) {
      return { error: err.message || "Scraper execution failed" };
    }
  },
};
