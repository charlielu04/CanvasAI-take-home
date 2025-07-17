import 'dotenv/config';
import { scrape }  from "../stagehand/scrape.js";


const url = process.argv[2];

if (!url) {
  console.error("Usage: node test_module.js <BBB search URL>");
  process.exit(1);
}

const result = await scrape.run({ url });

console.log(JSON.stringify(result, null, 2));
