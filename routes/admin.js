const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");
const viewhelpers = require("../viewhelpers");

const fs = require('fs');
const path=require('path');

// создаем парсер для данных application/x-www-form-urlencoded
const urlencodedParser = bodyParser.urlencoded({extended: false});


function isAuthorized(id){
    return (id===sessionId);
}





router.get("/concerts", (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        
        res.render('admin/concerts.hbs',{layout: false});
      } else {
          
        res.redirect("/admin/login");
      }

    
});

router.get("/news", (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        
        res.render('admin/news.hbs',{layout: false});
      } else {
          
        res.redirect("/admin/login");
      }    
});

router.get("/composers", (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        
        res.render('admin/composers.hbs',{layout: false});
      } else {
          
        res.redirect("/admin/login");
      }    
});

router.get("/artists", (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        var names= viewhelpers.NamesOfDirFilesWOExtension("/static/img/about/artists");
        res.render('admin/artists.hbs',   {names, layout: false});
      } else {
          
        res.redirect("/admin/login");
      }    
});

router.post("/artists/delete", urlencodedParser, (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        fs.unlinkSync(path.join(__dirname, '../','/static/',req.body.filename));        
      } else {
        res.redirect("/admin/login");
      }    
});

router.post("/artists/upload", urlencodedParser, (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
          }        
          // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
          let fileToUpload = req.files.fileToUpload;        
          // Use the mv() method to place the file somewhere on your server
          fileToUpload.mv(path.join(__dirname,'..','/static/img/about/artists/',fileToUpload.name), function(err) {
            if (err)   return res.status(500).send(err);        
            res.render('admin/admin', {id:4});
          });

      } else {
        res.redirect("/admin/login");
      }    
});



router.get("/gallery", (req,res)=>{
    if (isAuthorized(req.cookies.id)){
        
        res.render('admin/gallery.hbs',{layout: false});
      } else {
          
        res.redirect("/admin/login");
      }    
});





router.get("/login",(req,res)=>{
    res.render("admin/login");
  });
  
  const admin={
    user: "root",
    password: "devpassword123"
  }
  var sessionId='none';

  
  router.get('/', function(req, res) {

    if (isAuthorized(req.cookies.id)){
        
      res.render("admin/admin");
    } else {
        
      res.redirect("/admin/login");
    }
    
  });
  
 
  router.post("/login", urlencodedParser,(req,res)=>{
      
    if ((req.body.username===admin.user)&&(req.body.password===admin.password)){
      sessionId=uuidV4();
      
      res.cookie("id",sessionId,{maxAge: 360000});
      res.redirect("/admin");
    } else{
        
      res.redirect("/admin/login");
    }  
  });


  router.post("/artists", urlencodedParser,(req,res)=>{
      
    res.send("done"); 
  });
  
  router.get('/logout', function(req, res) {
    res.clearCookie('id');
    res.redirect("/");  
  });
   

module.exports = router;