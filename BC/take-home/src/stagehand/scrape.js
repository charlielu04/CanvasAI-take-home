import { Stagehand } from "@browserbasehq/stagehand";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

export const scrape = {
  description: "Scrape BBB data across pages 1-15 using Stagehand with duplicate filtering",
  parameters: { url: { type: "string", description: "BBB search results URL (include page=X)" } },
  async run({ url }) {
    if (!url) return { error: "Missing URL" };

    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      verbose: 1,
      debugDom: true,
      enableCaching: true,
      modelName: "gpt-4o-mini",
      domSettleTimeoutMs: 3000,
    });

    try {
      const sanitize = str => (str || "").replace(/[\r\n]+/g, " ").trim();
      await stagehand.init();

      const allBusinesses = [];
      const seen = new Set();

      for (let page = 1; page <= 15; page++) {
        const pageUrl = `${url}${page}`;

        await stagehand.page.goto(pageUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        // extract links from current page
        const links = await stagehand.page.evaluate(() =>
          Array.from(document.querySelectorAll('h3 a')).map(el => ({
            businessName: el.textContent.trim(),
            profileUrl: el.href
          }))
        );

        for (const { businessName, profileUrl } of links) {
          try {
            await stagehand.page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

            const raw = await stagehand.page.extract({
              instruction: `On this BBB profile page, extract businessName, address, phone, primaryContact (if available), and accreditationStatus. Return a JSON object.`,
              shape: {
                businessName: "string",
                address: "string",
                phone: "string",
                primaryContact: "string",
                accreditationStatus: "string"
              }
            });
            let details = raw;
            if (raw.extraction && typeof raw.extraction === 'string') {
              details = JSON.parse(raw.extraction);
            }

            // Sanitize
            const nameClean = sanitize(details.businessName || businessName);
            const addressClean = sanitize(details.address);
            const phoneClean = sanitize(details.phone);
            const contactClean = sanitize(details.primaryContact);
            const accStatusClean = sanitize(details.accreditationStatus);

            const key = `${details.businessName || businessName}--${details.phone}`;
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);

            allBusinesses.push({
              businessName: nameClean,
              address: addressClean || "Not Available",
              phone: phoneClean || "Not Available",
              primaryContact: contactClean || "Not Available",
              accreditationStatus: accStatusClean || "Unknown",
              profileUrl,
            });
          } catch (err) {
            console.error(`Error on ${businessName}:`, err.message);
          }
        }
      }


      // write CSV
      const csvWriter = createObjectCsvWriter({
        path: "medical_billing_companies.csv",
        header: [
          { id: "businessName", title: "Business Name" },
          { id: "address", title: "Address" },
          { id: "phone", title: "Phone Number" },
          { id: "primaryContact", title: "Primary Contact" },
          { id: "accreditationStatus", title: "BBB Accreditation Status" },
          { id: "profileUrl", title: "Profile URL" }
        ]
      });
      await csvWriter.writeRecords(allBusinesses);

      const csv = fs.readFileSync("medical_billing_companies.csv", "utf-8");
      return {
        json: allBusinesses,
        csv,
      };
    } catch (error) {
      console.error("Error in scrape:", error);
      return { error: error.message || "Scrape failed" };
    } finally {
      await stagehand.close();
    }
  }
};
