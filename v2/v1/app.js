var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var Campground = require("./models/campgrounds");
var Comment = require("./models/comments");
var seedDB = require("./seeds");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var User = require("./models/user");
var methodOverride = require("method-override");
var flash = require("connect-flash");

//seedDB();



mongoose.connect("mongodb://localhost:27017/yelp_camp", {useNewUrlParser: true});
app.use(bodyParser.urlencoded({extended:true}));

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(flash());

//Passport

app.use(require("express-session")({
	secret: "Once again Rusty Wins",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});
 
   //root page     
app.get("/", function(req,res){
    res.render("landing");
});
 
//Index- show all campgrounds
app.get("/campgrounds", function(req,res){
	
	Campground.find({}, function(err, allCampgrounds){
		if(err){
			console.log(err);
		}else{
			 res.render("campgrounds/campgrounds.ejs",{campgrounds:allCampgrounds, currentUser: req.user});
		}
	});
    
       
})
//Show form to submit new campgrounds
app.post("/campgrounds",isLoggedIn, function(req,res){
   var name = req.body.name;
   var image = req.body.image;
   var desc = req.body.description;
	 var author = {
	   id: req.user._id,
	   username: req.user.username
   }
   var newCampground = {name: name, image: image, description: desc, author: author}
  
   //Create a new campground and save to mongodb
   Campground.create(newCampground, function(err, newlyCreated){
	   if(err){
		   console.log(err);
	   }else{
		   console.log(newlyCreated);
		   res.redirect("/campgrounds");
	   }
   });
});

//new -show form to create new campgrounds
app.get("/campgrounds/new", isLoggedIn, function(req, res) {
    res.render("campgrounds/new.ejs");
});



app.get("/campgrounds/:id", function(req, res){
	Campground.findById(req.params.id).populate("comments").exec(function(err, findCampground){
		if(err){
			console.log(err);
		}else{
			console.log(findCampground);
			res.render("campgrounds/show", {campground: findCampground});
		}
	});
})
//edit campgrounds
app.get("/campgrounds/:id/edit", function(req, res){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id, function(err, campground){
		if(err){
			console.log(err);
			res.redirect("/campgrounds");
		}else{
			
			if(campground.author.id.equals(req.user_id)){
			res.render("campgrounds/edit", {campground: campground});
			}else{
				res.render("campgrounds/edit", {campground: campground});
			}
		}
	});
	}else{
		res.send("you need to be logged in");
	}
	
})

app.put("/campgrounds/:id", function(req,res){
	
	Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
		if(err){
			console.log(err);
			res.redirect("/campgrounds");
		}else{
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

app.delete("/campgrounds/:id", function(req,res){
	Campground.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/campgrounds");	
		}else{
			res.redirect("/campgrounds");
		}
	});
});

app.get("/campgrounds/:id/comments/new",isLoggedIn, function(req,res){
	Campground.findById(req.params.id, function(err, campground){
		if(err){
			console.log(err);
		}else{
			res.render("comments/new", {campground: campground});
		}
	})
})

app.post("/campgrounds/:id/comments", isLoggedIn,  function(req,res){
	 Campground.findById(req.params.id, function(err, campground){
       if(err){
           console.log(err);
           res.redirect("/campgrounds");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               //add username and id to comment
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               campground.comments.push(comment);
               campground.save();
               console.log(comment);
			   req.flash("success", "Comment successfully added!");
               res.redirect('/campgrounds/' + campground._id);
           }
        });
       }
   });
})
	

//Authenticator Routes

//show register form
app.get("/register", function(req, res){
	res.render("register");
});

//signup Logic
app.post("/register", function(req,res){
	var newUser = new User({username: req.body.username});
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			req.flash("error", err.message);
			return res.render("register")
		}
			passport.authenticate("local")(req, res, function(){
				req.flash("success", "Welcome too yelp camp");
				res.redirect("/campgrounds");
			});
	    })
    });

//show login form
app.get("/login", function(req,res){
	res.render("login");
});


app.post("/login", passport.authenticate("local",
	{
		successRedirect: "/campgrounds",
    	failureRedirect: "/login"
    }), function(req,res){
});

app.get("/logout", function(req,res){
	req.logout();
	req.flash("success", "logged you out!");
	res.redirect("/campgrounds");
})

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please Login First!")
	res.redirect("/login");
};




app.listen(3000, function(){
    console.log("The YelpCamp Server has started");
})