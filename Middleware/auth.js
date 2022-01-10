import jwt from "jsonwebtoken";
async function auth(req, res, next) {
  try {
    const token = req.header("Authorization");
    jwt.verify(token, process.env.JWT_KEY);
    next();
  } catch (err) {
    res.send({ error: err.message });
  }
}

export default auth;
