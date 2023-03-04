const express = require("express");
const app = express();

// We will switch to using cookie-session instead of cookie-parser because it is more secure
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const { 
  generateRandomString, 
  getUserByEmail, 
  urlsForUser
} = require("./helpers");
const { users, urlDatabase } = require("./database");
const PORT = 8080; // default port 8080


app.set("view engine", "ejs");

// This is used to parse the cookie header and populate req.cookies with an object keyed by the cookie names it will also have a maxAge property if the cookie contains the Expires or Max-Age attribute
app.use(
  cookieSession({
    name: "session",
    keys: [`key1`],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

// Middleware that is used to parse the body of the request sent to the server
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  if(req.session.user_id) {
    res.redirect("/urls")
  } else {
    res.redirect("/login")
  }
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;

  // Check if user is logged in
  if (!userId) {
    return res.status(401).send("Please log in or register");
  }

  // Get user object from users database
  const user = users[userId];

  const userURL = urlsForUser(userId, urlDatabase);

  const templateVars = {
    urls: userURL,
    user,
  };

  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  // This variable is used to get the user from the users object
  const userId = req.session.user_id;

  // This is used to check if the user exists
  if (!userId) {
    res.redirect("/login")
    res.status(401).send("Please log in or register");
    // If the user does exist then render the urls_new.ejs file
  } else {
    const user = users[userId];

    const templateVars = {
      user
    };

    // console.log(templateVars)
    res.render("urls_new", templateVars);
  }
  
});


app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;

  // Check if user is logged in
  if (!userId) {
    return res.status(401).send("Please log in or register");
  }

  // Check if shorturl is legitimate
  const url = urlDatabase[req.params.id];
  if (!url) {
    return res.status(404).send("URL not found");
  }

  // Check if user has access to URL
  if (url.userID !== userId) {
    return res.status(403).send("You do not have access to this URL");
  }

  const templateVars = {
    id: req.params.id,
    longURL: url.longURL,
    user: users[userId],
  };
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  // This is used to get the userId from the cookies
  const userId = req.session.user_id;

  // This is used to check if the user exists
  if (!userId) {
    return res.status(401).send("Please log in or register");
  }
  //Used to create a random string for the shortURL
  const shortURL = generateRandomString();
  //Used to add the shortURL and longURL to the urlDatabase as a key value pair where shortURL is the key and req.body.longURL is the value
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: userId,
  };

  //Redirect the user to the new page that shows them the new short URL they created
  res.redirect(`/urls/${shortURL}`);
});

// POST route used for deleting URLs on the server side
app.post("/urls/:id/delete", (req, res) => {
  // Check if user is logged in
  if (!req.session.user_id) {
    return res.status(401).send("Please log in or register");
  }

  // Check if shorturl is legitimate
  const url = urlDatabase[req.params.id];
  if (!url) {
    return res.status(404).send("URL not found");
  }

  // Check if user has access to URL
  if (url.userID !== req.session.user_id) {
    return res.status(403).send("You do not have access to this URL");
  }
  const id = req.params.id;
  delete urlDatabase[id];
  res.redirect("/urls");
});

// POST route used for updating URLs on the server side
app.post("/urls/:id", (req, res) => {
  // Check if user is logged in
  if (!req.session.user_id) {
    return res.status(401).send("Please log in or register");
  }

  // Check if shorturl is legitimate
  const url = urlDatabase[req.params.id];
  if (!url) {
    return res.status(404).send("URL not found");
  }

  // Check if user has access to URL
  if (url.userID !== req.session.user_id) {
    return res.status(403).send("You do not have access to this URL");
  }

  const shortURL = req.params.id;
  const newLongURL = req.body.longURL;
  urlDatabase[shortURL].longURL = newLongURL; // Update the value of the shortURL key to the new longURL value
  res.redirect("/urls");
});

// This route needs work to make it worki invalid urls still go through
// Used to redirect the user to the longURL when they click on the shortURL
app.get("/u/:id", (req, res) => {  
  // This is used to check if the url exists
  if (!urlDatabase[req.params.id]) {
    res.status(400).send("URL not found");
  } else {
    const url = urlDatabase[req.params.id].longURL;
    // This is used to redirect the user to the url
    res.redirect(url);
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Email and password cannot be blank")
  }

  const user = getUserByEmail(email, users);

  if(!user) {
    return res.status(400).send("Email not found. Please register.")
  }

  // This is used to check if the password is correct
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).send("Password incorrect")
  }

  // This is used to set the cookie to the user id
  req.session.user_id = user.id;
  res.redirect("/urls");
});

// This is used to clear the cookie when the user clicks on the logout button
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// This route is used to render the register page
app.get("/register", (req, res) => {
  const user = users[req.session["user_id"]];

  const templateVars = {user}
  // This is used to check if the user is logged in if a user is logged in then it will redirect them to the urls page
  if (user) {
    res.redirect("/urls");
  } else {
    res.render("register", templateVars);
  }
});

// This route handles the registration form data
app.post("/register", (req, res) => {
  // This is used to get the email and password from the form
  const email = req.body.email;
  const password = req.body.password;
  
  // this is used to check if the email or password is empty
  if (!email || !password) {
    res.status(400).send("Email or password is empty");
    return;
  }
  
  // This is used to check if the email is already in the database
  if (getUserByEmail(email, users)) {
    res.status(400).send("Email is already in the database. Please login");
    return;
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = generateRandomString();

  // This is used to create a new user object
  const newUser = {
    id,
    email,
    password: hashedPassword, // This is used to hash the password and store it rather than the plain text password
  };
  // This is used to check if the email is already in the database
  users[id] = newUser;
  // This is used to set the user_id session variable
  req.session.user_id = id

  // This is used to redirect the user to the urls page
  res.redirect("/urls");
});

// Rotue for the login page
app.get("/login", (req, res) => {
  
  // If the user is logged in, GET /login should redirect to GET /urls
  const user = users[req.session["user_id"]];
  const templateVars = { user }

  if (user) {
    res.redirect("/urls");
  
  } else {
    res.render("login", templateVars);
  }
});

// Used to tell console what port the server is running on
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
