//jshint esversion:6
require('dotenv').config();
const express=require("express")
const bodyParser=require("body-parser")
const ejs=require("ejs")
const mongoose=require("mongoose");
//const encrypt=require("mongoose-encryption");
//const md5=require("md5");
// const bcrypt=require("bcrypt");
// const saltRounds=10
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app=express();

//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret:"Our little secret ",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

main().then(() => console.log("Successfully connected to mongodb")).catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
}
//mongoose.set("useCreateIndex", true);

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
}); 

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});

app.get("/",function(req,res){
    res.render("home")
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/secrets",function(req,res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }
    // else{
    //     res.redirect("/login");
    // }
    User.find({"secret":{$ne:null}}).then(function(foundUser){
        if(foundUser){
            res.render("secrets",{usersWithSecrets:foundUser});
        }
    });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }
    
});

app.get("/logout",function(req,res){
    req.logout(function(err){
    if(!err){
        res.redirect("/");
    }
    });
})

app.post("/register",function(req,res){

    // bcrypt.hash(req.body.password,saltRounds,function(hash,err){
    //     const newUser=new User({
    //         email:req.body.username,
    //         password:hash
    //     });
    //     newUser.save().then(function(err){
    //      if(err){
    //         res.render("secrets");
    //      }
    //      else{
    //         console.log(err);
    //      }
    //     });
    // })

    User.register({username:req.body.username},req.body.password,function(user,err){
        if(!user){
            console.log(err);
            res.redirect("/register");
        }
        else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets")
        })

        
        }
    })
    
});

app.post("/login",function(req,res){

    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
        else{
            console.log(err);
        }
    })
    // const username=req.body.username;
    // // const password=md5(req.body.password);
    // const password= (req.body.password);
    // // console.log(password);
    // User.findOne({email:username}).then(function(foundUser,err){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         if(foundUser){
    //             // if(foundUser.password===password){
    //             //     res.render("secrets");
    //             // }
    //             bcrypt.compare(password,foundUser.password, function( result,error) {
    //                if( result === true){
    //                 res.render("secrets");
    //                }
    //             });
    //         }
    //     }
    // })
    
});

app.post("/submit",function(req,res){
     const submittedSecret=req.body.secret;
     //console.log(req.user._id);
     //console.log(req.user);
     User.findById(req.user._id).then(function(foundUser){
        // if(err){
        //     console.log(err);
        // }
      //  else{
            if(foundUser){
                foundUser.secret=submittedSecret;
                foundUser.save().then(function(){
                    res.redirect("/secrets");
                })
            }
        //}
     })
})

app.listen(3000,function(req,res){
    console.log("Server is running on port 3000");
});