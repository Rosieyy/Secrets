
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose =  require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

// const encrypt = require("mongoose-encryption"); //1
// const md5 = reuire("md5"); //2
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app =express();
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "little me",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ["password"]});

const User = mongoose.model("User",userSchema);

passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrects"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrects', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

  app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}}).then((foundUsers)=>{
        res.render("secrets",{userWithSecret:foundUsers});
    }).catch((err)=>{console.log(err);});
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
    console.log(req.user.id,submittedSecret);
    User.findById(req.user.id).then((foundUser)=>{
        foundUser.secret = submittedSecret;
        foundUser.save().then(()=>{
            res.redirect("secrets");
        }).catch((err)=>{
            console.log(err);
        });

    }).catch((err)=>{
        console.log(err);
    });
});

app.get('/logout', function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    
    //     newUser.save().then(()=>{
    //         res.render("secrets")
    //     }).catch((err)=>{
    //         console.log(err);
    //     });
    // });

    
});

app.post("/login",function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
            res.redirect("/register")
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

    // User.findOne({email:userNmae}).then((findUser)=>{
    //     bcrypt.compare(passWord, findUser.password, function(err, result) {
    //         // result == true
    //         if(result === true){
    //             res.render("secrets");
    //         }
    //     });
    // }).catch((err)=>{
    //     console.log(err);
    // });

});









app.listen(3000,function(){
    console.log("server started on port 3000");
})