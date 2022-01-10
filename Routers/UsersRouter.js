import { client } from "../index.js";
import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";

import {
  createUser,
  generateHashPassword,
  getUserByEmail,
  getUserById,
  resetPassword,
  updateResetToken,
  sendMail,
  getUserToken,
} from "../helpers.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.route("/signup").post(async (req, res) => {
  const { email, password } = req.body;
  const checkUserAlreadyExist = await getUserByEmail(email);

  if (checkUserAlreadyExist) {
    res.status(401).send({ message: "Username already exists" });
    return;
  }
  const hashedPassword = await generateHashPassword(password);
  const activationToken = crypto.randomBytes(32).toString("hex");
  const mongoResponse = await createUser({
    ...req.body,
    password: hashedPassword,
    activationToken: activationToken,
    activated: false,
  });
  if (mongoResponse.acknowledged) {
    const createdUser = await getUserByEmail(email);
    const token = await getUserToken({
      id: createdUser._id,
      email: createdUser.email,
      active: createdUser.activated,
    });

    const activationLink = `${process.env.CLIENT_URL}/users/activation?token=${activationToken}&id=${createdUser._id}`;
    const html = `<div>
              <div>Click the below link to reset your password</div>
              <a href=${activationLink}>${activationLink}</a>
         </div>`;
    const subject = "Account Activation Link";
    const text = "Account Activation";
    sendMail(createdUser.email, html, subject, text)
      .then(async (msg) => {
        res.send({
          message:
            "Mail sent to your email, Please click the link in mail to activate your account",
          token: token,
        });
      })
      .catch((error) => {
        console.log(error);
        res.send({ message: "Error!", error });
      });
  }
});
router.route("/login").put(async (req, res) => {
  const { email, password } = req.body;

  const userDetails = await getUserByEmail(email);

  if (!userDetails) {
    res.status(401).send({ message: "Account doesn't exist" });
    return;
  }
  const matchpassword = await bcrypt.compare(password, userDetails.password);

  if (matchpassword) {
    const token = await getUserToken({
      id: userDetails._id,
      email: userDetails.email,
      active: userDetails.activated,
    });
    res.send({
      message: "Successfull login",
      token: token,
      id: userDetails._id,
    });
  } else {
    res.status(401).send({ message: "Invalid credentials" });
  }
});

router.route("/activation").get(async (req, res) => {
  const { token, id } = req.query;
  const userDetails = await getUserById(id);
  if (userDetails.activationToken === token) {
    const activateUser = await client
      .db("urlShortener")
      .collection("users")
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { activated: true }, $unset: { activationToken: "" } }
      );

    if (activateUser.modifiedCount > 0) {
      res.send({ message: "Your Account is Activated" });
    } else {
      res.status(401).send({ message: "Error!" });
    }
  } else {
    res.status(401).send({ message: "Token Invalid" });
  }
});

router.route("/forgotpassword").put(async (req, res) => {
  const { email } = req.body;

  const userDetails = await getUserByEmail(email);
  if (!userDetails) {
    res.status(401).send({ message: "Account doesn't exist" });
    return;
  }
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetPasswordLink = `https://resetpassword9.netlify.app/resetpassword?token=${resetToken}&id=${userDetails._id}`;

  const html = `<div>
              <div>Click the below link to reset your password</div>
              <a href=${resetPasswordLink}>${resetPasswordLink}</a>
         </div>`;
  const subject = "Reset Password Link";
  const text = "Reset Password";

  sendMail(userDetails.email, html, subject, text)
    .then(async (msg) => {
      const resetTokenRes = await updateResetToken(resetToken, userDetails._id);

      if (resetTokenRes.modifiedCount > 0) {
        res.send({
          message:
            "Email sent to your mail, if not found, please check your spam folder",
        });
      } else {
        res.status(401).send({ message: resetTokenRes });
      }
    })
    .catch((error) => {
      console.log(error);
      res.send({ message: "Error!", error });
    });
});

router.route("/resetpassword").put(async (req, res) => {
  const { token, id, password } = req.body;

  const userDetails = await getUserById(id);

  if (!userDetails) {
    res.status(401).send({ message: "Something went wrong!" });
    return;
  }
  if (userDetails.resetToken === token) {
    const hashedPassword = await generateHashPassword(password);
    const mongoResponse = await resetPassword(hashedPassword, id);

    if (mongoResponse.modifiedCount > 0) {
      res.send({ message: "Password Changed Successfully", status: true });
    }
  } else {
    res.status(401).send({ message: "Token Expired" });
  }
});

router.route("/:id").get(async (req, res) => {
  const { id } = req.params;
  const urls = await client
    .db("urlShortener")
    .collection("users")
    .findOne({ _id: ObjectId(id) }, { projection: { urlsDetails: 1, _id: 0 } });
  if (urls) {
    res.send(urls);
    return;
  }
  res.send({ message: "Error!" });
});

export const usersRouter = router;
