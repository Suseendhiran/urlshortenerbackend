import { client } from "../index.js";
import express from "express";
import shortId from "shortid";
import auth from "../Middleware/auth.js";
import { getUserIdFromToken } from "../helpers.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.route("/:shorturl").get(async (req, res) => {
  const shorturl = req.params.shorturl;

  const response = await client
    .db("urlShortener")
    .collection("shortUrls")
    .findOne({ shortId: shorturl }, { projection: { originalUrl: 1, _id: 0 } });
  const updateClick = await client
    .db("urlShortener")
    .collection("users")
    .updateOne(
      {
        "urlsDetails.shortId": shorturl,
      },
      { $inc: { "urlsDetails.$.clicks": 1 } }
    );

  if (response && updateClick.modifiedCount > 0) {
    res.redirect(response.originalUrl);
    return;
  }
  res.status(401).send({ message: "Update error" });
});

router.route("/shorturls").post(auth, async (req, res) => {
  const id = await getUserIdFromToken(req.header("Authorization"));

  const uniqueId = shortId.generate();
  const shortUrl = `${process.env.CLIENT_URL}/${uniqueId}`;
  const payload = {
    originalUrl: req.body.originalUrl,
    shortId: uniqueId,
  };
  const generateUrlResponse = await client
    .db("urlShortener")
    .collection("shortUrls")
    .insertOne(payload);
  const updateUserResponse = await client
    .db("urlShortener")
    .collection("users")
    .updateOne(
      { _id: ObjectId(id) },
      { $push: { urlsDetails: { ...payload, shortUrl: shortUrl, clicks: 0 } } }
    );
  if (
    generateUrlResponse.acknowledged &&
    updateUserResponse.modifiedCount > 0
  ) {
    res.send({ message: "Shorturl generated", status: true });
    return;
  }
  res.status(401).send({ message: "Error!", status: false });
});

export const ShortenerRouter = router;
