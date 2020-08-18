const express = require("express");
const router = express.Router();



router.get("/photos", (req,res)=>{
    res.render('media/photos.hbs');
});
router.get("/videos", (req,res)=>{
    res.render('media/videos.hbs');
});







module.exports = router;