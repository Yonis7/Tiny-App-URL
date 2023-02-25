const express = require("express");
const app = express();

// We will switch to using cookie-session instead of cookie-parser because it is more secure
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
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

//This function is used to generate a random string for the shortURL
const generateRandomString = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};


// Refactored function required to be used from the helpers.js file
const { getUserByEmail } = require("./helpers");

const urlsForUser = (id) => {
  const filteredUrls = {};
  for (const shortUrl in urlDatabase) {
    if (urlDatabase[shortUrl].userID === id) {
      filteredUrls[shortUrl] = urlDatabase[shortUrl];
    }
  }
  return filteredUrls;
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;

  // Check if user is logged in
  if (!userId) {
    return res.status(401).send("Please log in or register");
  }

  // Get user object from users database
  const user = users[userId];

  const userURL = urlsForUser(userId);

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
    return res.status(401).send("Please log in or register");
    // If the user does exist then render the urls_new.ejs file
  } else {
    const user = users[userId];

    const templateVars = {
      user,
    };
    res.render("urls_new", templateVars);
  }
  
});

app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;

  // Check if user is logged in
  if (!userId) {
    return res.status(401).send("Please log in or register");
  }

  // Check if user has access to URL
  const url = urlDatabase[req.params.id];
  if (!url) {
    return res.status(404).send("URL not found");
  }
  if (url.userID !== userId) {
    return res.status(403).send("You do not have access to this URL");
  }

  // const user = users[userId];

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

  // console.log(req.body); // Log the POST request body to the console

  //Redirect the user to the new page that shows them the new short URL they created
  res.redirect(`/urls/${shortURL}`);
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
  urlDatabase[shortURL].longURL = newLongURL; // Update the value of the shortURL key to the new longURL value
  res.redirect("/urls");
});

// This route needs work to make it worki invalid urls still go through
// Used to redirect the user to the longURL when they click on the shortURL
app.get("/u/:id", (req, res) => {
  // This variable is used to get the user from the users object
  const url = urlDatabase[req.params.id];
  
  // This is used to check if the url exists
  if (!url) {
    res.status(400).send("URL not found");
  } else {
    res.redirect(url);
  }
  // This is used to redirect the user to the url
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(email);

  // This is used to check if the user exists
  if (user && bcrypt.compareSync(password, user.password)) {

    // This is used to set the cookie to the user id
    req.session.user_id = user.id;
    res.redirect("/urls");
  
  } else {
    res.status(400).send("User not found");
  }
});

// // Helper function to get user object by username
// function getUserByUsername(username) {
//   for (const userId in users) {
//     const user = users[userId];
//     if (user.username === username) {
//       return user;
//     }
//   }
//   return null;
// }

// This is used to clear the cookie when the user clicks on the logout button
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// This route is used to render the register page
app.get("/register", (req, res) => {
  const user = users[req.session["user_id"]];
  // This is used to check if the user is logged in if a user is logged in then it will redirect them to the urls page
  if (user) {
    res.redirect("/urls");
  } else {
    res.render("register");
  }
});

// This route handles the registration form data
app.post("/register", (req, res) => {
  const id = generateRandomString();
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

  const hashedPassword = bcrypt.hashSync(password, 10);

  // This is used to create a new user object
  const newUser = {
    id,
    email,
    password: hashedPassword, // This is used to hash the password and store it rather than the plain text password
  };
  // This is used to check if the email is already in the database
  users[id] = newUser;
  // This is used to set the user_id session variable
  req.session.user_id = id;

  // This is used to redirect the user to the urls page
  res.redirect("/urls");
});

// Rotue for the login page
app.get("/login", (req, res) => {
  
  // If the user is logged in, GET /login should redirect to GET /urls
  const user = users[req.session["user_id"]];
  if (user) {
    res.redirect("/urls");
  
  } else {
    res.render("login");
  }
});

// Used to tell console what port the server is running on
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
