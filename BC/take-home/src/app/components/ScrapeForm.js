"use client";

import { useState } from "react";
import "./ScrapeForm.css";

export default function ScrapeForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Scraper failed");

      setResults(data.output); // JSON array
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="scrape-form">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter BBB base URL..."
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Scraping..." : "Run Scraper"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <table className="results-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Primary Contact</th>
              <th>Address</th>
              <th>Accredited</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {results.map((c, idx) => (
              <tr key={idx}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.principal_contact}</td>
                <td>{c.address}</td>
                <td>{c.accredited ? "✅" : "❌"}</td>
                <td>
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    Visit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
