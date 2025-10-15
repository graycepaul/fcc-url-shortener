// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");
const { URL } = require("url");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true })); // body-parser for form POSTs
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// simple /api/hello for sanity
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// In-memory store: short_url -> original_url
// and reverse map original_url -> short_url to avoid duplicates
const urlDatabase = {};
const reverseLookup = {};
let nextShort = 1;

// POST /api/shorturl
app.post("/api/shorturl", function (req, res) {
  const originalUrl = req.body.url;

  if (!originalUrl) {
    return res.json({ error: "invalid url" });
  }

  // Parse URL to extract hostname and ensure valid protocol
  let hostname;
  try {
    const parsed = new URL(originalUrl);

    // Only accept http(s)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.json({ error: "invalid url" });
    }

    hostname = parsed.hostname;
  } catch (e) {
    // invalid URL constructor => invalid
    return res.json({ error: "invalid url" });
  }

  // Use dns.lookup to verify hostname resolves
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    // If we've already shortened this URL, return existing short_url
    if (reverseLookup[originalUrl]) {
      const existingShort = reverseLookup[originalUrl];
      return res.json({ original_url: originalUrl, short_url: existingShort });
    }

    // Otherwise create a new short url entry
    const short = nextShort++;
    urlDatabase[short] = originalUrl;
    reverseLookup[originalUrl] = short;

    return res.json({ original_url: originalUrl, short_url: short });
  });
});

// GET /api/shorturl/:short_url -> redirect to original
app.get("/api/shorturl/:short", function (req, res) {
  const short = Number(req.params.short);

  if (!short || !urlDatabase[short]) {
    return res.json({ error: "No short URL found for the given input" });
  }

  return res.redirect(urlDatabase[short]);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
