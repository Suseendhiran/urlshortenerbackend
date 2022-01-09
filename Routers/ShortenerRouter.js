import { client } from "../index.js";
import express from "express";
import shortId from "shortid";

const router = express.Router();

router.route("/:shorturl").get(async (req, res) => {
  const shorturl = req.params.shorturl;
  const response = await client
    .db("urlShortener")
    .collection("shortUrls")
    .findOne({ shortId: shorturl }, { projection: { originalUrl: 1, _id: 0 } });
  if (response.originalUrl) {
    res.redirect(response.originalUrl);
    await client
      .db("urlShortener")
      .collection("shortUrls")
      .updateOne({ shortId: shorturl }, { $inc: { clicks: 1 } });
  }
  console.log("full", response.originalUrl, req.params.shorturl);
});

router.route("/shorturls").post(async (req, res) => {
  const uniqueId = shortId.generate();
  const shortUrl = `${process.env.CLIENT_URL}/${uniqueId}`;
  const generateUrlResponse = await client
    .db("urlShortener")
    .collection("shortUrls")
    .insertOne({
      originalUrl: req.body.originalUrl,
      shortId: uniqueId,
      shortUrl: shortUrl,
      clicks: 0,
    });
  if (generateUrlResponse.acknowledged) {
    res.send({ message: "Shorturl generated", status: true });
    return;
  }
  res.status(401).send({ message: "Error!", status: false });
});

export const ShortenerRouter = router;
