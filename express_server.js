const express = require("express");
const app = express();

// used to parse the cookie header and populate req.cookies with an object keyed by the cookie names
const cookieParser = require('cookie-parser')

const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

app.use(cookieParser());
// Middleware that is used to parse the body of the request sent to the server
app.use(express.urlencoded({ extended: true }));

//This function is used to generate a random string for the shortURL
const generateRandomString = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};


const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

const urlDatabase = {
  b2xVn2: "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  // This variable is used to get the user from the users object
  const user = users[req.cookies["user_id"]]

  const templateVars = {
    urls: urlDatabase,
    user
  };  
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  // This variable is used to get the user from the users object
  const user = users[req.cookies["user_id"]]
  // This variable is used to pass the user object to the urls_new.ejs file
  const templateVars = { user };

  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const user = users[req.cookies["user_id"]];
  const templateVars = { 
    id: req.params.id, 
    longURL: urlDatabase[req.params.id],
    user
  };
  res.render("urls_show", templateVars);
});


app.post("/urls", (req, res) => {

  //Used to create a random string for the shortURL
  const shortURL = generateRandomString();
  //Used to add the shortURL and longURL to the urlDatabase as a key value pair where shortURL is the key and req.body.longURL is the value
  urlDatabase[shortURL] = req.body.longURL

  // console.log(req.body); // Log the POST request body to the console

  //Redirect the user to the new page that shows them the new short URL they created
  res.redirect(`/urls/${shortURL}`)

});

// POST route used for deleting URLs on the server side
app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  delete urlDatabase[id];
  res.redirect("/urls");
});
// POST route used for updating URLs on the server side
app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const newLongURL = req.body.longURL;
  urlDatabase[shortURL] = newLongURL; // Update the value of the shortURL key to the new longURL value
  res.redirect("/urls");
});


// Used to redirect the user to the longURL when they click on the shortURL
app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const user = getUserByUsername(username);

  // This is used to check if the user exists
  if (user) {
    res.cookie("user_id", user.id);
    res.redirect("/urls");
  } else {
    res.status(400).send("User not found");
  }
});

// Helper function to get user object by username
function getUserByUsername(username) {
  for (const userId in users) {
    const user = users[userId];
    if (user.username === username) {
      return user;
    }
  }
  return null;
}


// This is used to clear the cookie when the user clicks on the logout button
app.post("/logout", (req, res) => {
res.cookie("user_id", "");
res.redirect("/urls");
});

// This route is used to render the register page
app.get("/register", (req, res) => {

  res.render("register");
})

// This route handles the registration form data
app.post('/register', (req,res) => {
  const id = generteRandomString();
  // This is used to get the email and password from the form
  const email = req.body.email;
  const password = req.body.password;

  // this is used to check if the email or password is empty 
  if (!email || !password) {
    res.status(400).send("Email or password is empty");
    return;
  }

  // This is used to check if the email is already in the database
  if (getUserByEmail(email)) {
    res.status(400).send("Email is already in the database");
    return;
  }

  const newUser = {
    id,
    email,
    password
  }
  // This is used to check if the email is already in the database
  users[id] = newUser;
  // This is used to set the user_id cookie
  res.cookie("user_id", id);

  // This is used to redirect the user to the urls page
  res.redirect("/urls");

})