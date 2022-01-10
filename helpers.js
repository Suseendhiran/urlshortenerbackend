import { client } from "./index.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import jwt_decode from "jwt-decode";

async function createUser(userDetails) {
  return await client
    .db("urlShortener")
    .collection("users")
    .insertOne(userDetails);
}
async function getUserByEmail(email) {
  return await client
    .db("urlShortener")
    .collection("users")
    .findOne({ email: email });
}

async function getUserToken(tokenPayload) {
  return jwt.sign(
    {
      ...tokenPayload,
    },
    process.env.JWT_KEY
  );
}

async function getUserById(id) {
  return await client
    .db("urlShortener")
    .collection("users")
    .findOne({ _id: ObjectId(id) });
}
async function generateHashPassword(password) {
  let saltRounds = 10;
  const saltedPassword = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, saltedPassword);
  return hashedPassword;
}

async function resetPassword(password, id) {
  return await client
    .db("urlShortener")
    .collection("users")
    .updateOne(
      { _id: ObjectId(id) },
      { $set: { password: password, resetToken: null } }
    );
}

async function updateResetToken(token, id) {
  return await client
    .db("urlShortener")
    .collection("users")
    .updateOne({ _id: ObjectId(id) }, { $set: { resetToken: token } });
}

async function sendMail(email, html, subject, text) {
  const smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  smtpTransport.sendMail({
    from: process.env.MAIL_USERNAME,
    to: email,
    subject: subject,
    text: text,
    html: html,
  });
}

async function getUserIdFromToken(token) {
  const { id } = jwt_decode(token);
  return id;
}

export {
  createUser,
  getUserByEmail,
  generateHashPassword,
  getUserById,
  resetPassword,
  updateResetToken,
  sendMail,
  getUserToken,
  getUserIdFromToken,
};
