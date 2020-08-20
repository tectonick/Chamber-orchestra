const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const uuidV4 = require("uuid.v4");

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
        
        res.render('admin/artists.hbs',{layout: false});
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