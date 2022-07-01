// imports
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const yup = require("yup");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const { nanoid } = require("nanoid");
require("dotenv").config();

// connect to db
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URI);
client.connect();

// create an index for unique slug
const db   = client.db("urTiny")    // database
const urls = db.collection("urls"); // collection
urls.createIndex({slug: 1}, {unique: true});

// init express app
const app = express();
app.enable("trust proxy");

// helmet secures the http requests by suppling various HTTP-Headers
// morgan logs the requests
app.use(helmet());
app.use(morgan("common"));

// recognise incoming resp as a json obj
app.use(express.json());
app.use(express.static("./public"));

// path for 404 file
const _404 = path.join(__dirname, "public/404.html");

// redirect to website as per to slug
app.get("/:id", async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) { return res.redirect(url.url); }
    return res.status(404).sendFile(_404);
  } 
  catch (error) {
    return res.status(404).sendFile(_404);
  }
});

// table schema for slug
const schema = yup.object().shape({
  slug: yup
    .string()
    .trim()
    .matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

// store the slug in db
app.post(
  "/url",
  // slowdown and rate-limiting
  slowDown({
    windowMs: 30 * 1000,
    delayAfter: 3,
    delayMs: 500,
  }),
  rateLimit({
    windowMs: 30 * 1000,
    max: 3,
  }),
  async (req, res, next) => {
    let { slug, url } = req.body;
    try {
      // validate with table schema
      await schema.validate({ slug, url });

      if (url.includes("ismverse.ml")) { throw new Error("Have Peace!"); }
      if (!slug) { slug = nanoid(5); } 
      else {
        const existing = await urls.findOne({ slug });
        if (existing) { throw new Error("Slug already in use!"); }
      }

      slug = slug.toLowerCase();
      const newUrl = { url, slug };
      await urls.insertOne(newUrl);
      res.json(newUrl);
    } 
    catch (error) { next(error); }
  }
);

app.use((req, res, next) => {
  res.status(404).sendFile(_404);
});

app.use((error, req, res, next) => {
  if (error.status) { res.status(error.status); } 
  else { res.status(500); }

  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "gg" : error.stack,
  });
});

const port = process.env.PORT || 7171;
app.listen(port, () => { console.log(`Listening at http://localhost:${port}`); });