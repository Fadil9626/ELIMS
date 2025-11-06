const crypto = require("crypto");

const genPrefix = () =>
  `sk_${process.env.NODE_ENV === "production" ? "live" : "test"}_${crypto
    .randomBytes(3)
    .toString("base64url")}`;

const genRawKey = () => crypto.randomBytes(24).toString("base64url");
const genSalt   = () => crypto.randomBytes(16).toString("base64");
const hashKey   = (rawKey, salt) =>
  crypto.createHash("sha256").update(`${salt}:${rawKey}`).digest("hex");

module.exports = { genPrefix, genRawKey, genSalt, hashKey };
