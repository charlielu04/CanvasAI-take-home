import { scrape } from "../../../stagehand/module";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { url } = await request.json();
    console.log("Inserting URL:", url);

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const search_url = url;

    // Run Stagehand scraper
    const rawScrapeResult = await scrape.run({ url });

    if (!rawScrapeResult || !rawScrapeResult.json) {
      throw new Error("No JSON results returned from scrape module");
    }

    const results = rawScrapeResult.json;

    // Look up or insert search_url row
    let searchUrlRow;
    const { data: existing } = await supabase
      .from("search_urls")
      .select("*")
      .eq("url", search_url)
      .single();

    if (existing) {
      searchUrlRow = existing;
    } else {
      const { data, error: insertError } = await supabase
        .from("search_urls")
        .insert({ url: search_url })
        .select()
        .single();

      if (insertError) {
        console.error("SUPABASE URL INSERT ERROR:", insertError);
        throw new Error("Failed to insert search URL");
      }

      searchUrlRow = data;
    }

    

    // Insert results into Supabase
    const search_url_id = searchUrlRow.id;
    const enrichedResults = results.map((r) => ({ ...r, search_url_id }));

    const { error: insertResultsError } = await supabase
      .from("results")
      .upsert(enrichedResults, {
        onConflict: ["name", "phone", "search_url_id"],
      });

    if (insertResultsError) {
      console.error("SUPABASE RESULTS INSERT ERROR:", insertResultsError);
      throw new Error("Failed to insert results");
    }

    // Fetch all results for this search_url
    const { data: finalResults, error: fetchError } = await supabase
      .from("results")
      .select("*")
      .eq("search_url_id", search_url_id);

    if (fetchError) {
      console.error("SUPABASE RESULTS FETCH ERROR:", fetchError);
      throw new Error("Failed to fetch results");
    }
    // Return
    return new Response(JSON.stringify({ output: finalResults }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SCRAPE API ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
