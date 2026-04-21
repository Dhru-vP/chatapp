const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");

router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    const uploadRes = await cloudinary.uploader.upload(image, {
      folder: "chatapp",
    });

    res.json({ url: uploadRes.secure_url });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;