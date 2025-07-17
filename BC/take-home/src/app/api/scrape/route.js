import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

export const runtime = 'nodejs';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const runner = path.resolve(
      process.cwd(),
      'src',
      'scripts',
      'run_stagehand.js'
    );
    const cmd = `node "${runner}" "${url}"`;
    console.log('Running scraper:', cmd);

    const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 });
    if (stderr) console.warn('Scraper stderr:', stderr);

    const csvPath = path.resolve(process.cwd(), 'medical_billing_companies.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    if (parsed.errors.length) {
      console.error('CSV parse errors:', parsed.errors);
      return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
    }

    const results = parsed.data.map((row) => ({
      businessName: row['Business Name'] || '',
      address: row['Address'] || '',
      phone: row['Phone Number'] || '',
      primaryContact: row['Primary Contact'] || '',
      accreditationStatus: row['BBB Accreditation Status'] || '',
      url: row['Profile URL'] || '',
    }));

    let searchUrlRow;
    const { data: existing } = await supabase
      .from("search_urls")
      .select("*")
      .eq("url", url)
      .single();

    if (existing) {
      searchUrlRow = existing;
    } else {
      const { data, error: insertError } = await supabase
        .from("search_urls")
        .insert({ url })
        .select()
        .single();

      if (insertError) {
        console.error("SUPABASE URL INSERT ERROR:", insertError);
        throw new Error("Failed to insert search URL");
      }

      searchUrlRow = data;
    }

    const search_url_id = searchUrlRow.id;
    const enrichedResults = results.map((r) => ({ ...r, search_url_id }));

    const { error: insertResultsError } = await supabase
      .from("results")
      .upsert(enrichedResults, {
        onConflict: ["businessName", "phone", "search_url_id"],
      });

    if (insertResultsError) {
      console.error("SUPABASE RESULTS INSERT ERROR:", insertResultsError);
      throw new Error("Failed to insert results");
    }

    const { data: finalResults, error: fetchError } = await supabase
      .from("results")
      .select("*")
      .eq("search_url_id", search_url_id);

    if (fetchError) {
      console.error("SUPABASE RESULTS FETCH ERROR:", fetchError);
      throw new Error("Failed to fetch results");
    }

    return NextResponse.json({ output: finalResults }, { status: 200 });
  } catch (error) {
    console.error("SCRAPE API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}