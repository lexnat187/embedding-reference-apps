const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3001;

// these should match the settings in your Metabase instance
let MB_SITE_URL = "http://localhost:3000";
let MB_EMBEDDING_SECRET_KEY = "230e14ec089b2d22dd984dcd057b14df93e91f814f6f2526f2d10336ea40bf26";

let payload = {
  resource: { dashboard: 1 },
  params: {}
};

function checkAuth(req, res, next) {
    const userId = req.session.userId;
    if(userId) {
        return next();
    }
    req.session.redirectTo = req.path;
    return res.redirect('/login');
}

// the dashboard ID of a dashboard that has a `user_id` parameter
const DASHBOARD_ID = 1;

if (!MB_EMBEDDING_SECRET_KEY) {
  throw new Error("Please set MB_EMBEDDING_SECRET_KEY.");
}
if (typeof DASHBOARD_ID !== "number" || isNaN(DASHBOARD_ID)) {
  throw new Error("Please set DASHBOARD_ID.");
}

const app = express();

app.set("view engine", "pug");
app.use(session({ secret: "FIXME", resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => res.render("index"));

// basic auth routes,
// you should replace this with the auth scheme of your choice
app.route("/login")
    .get((req, res) => {
      res.render("login")
    })
    .post((req, res) => {
      const { username, password, redirect } = req.body;
      if(username === 'admin' && password === 'admin') {
          // set a user id for our 'admin' user. you'd do user lookup here
          req.session.userId = 1;
          res.redirect(req.session.redirectTo);
      } else {
          res.redirect('/login');
      }
    });

app.get("/logout", (req, res) => {
    delete req.session.userId;
    res.redirect("/");
});

// authenticated routes

app.get("/signed_chart/:id", checkAuth, (req, res) => {
    const userId = req.session.userId;
    const unsignedToken = {
        resource: { dashboard: DASHBOARD_ID },
        params: { user_id: userId }
    };

    // sign the JWT token with our secret key
    const signedToken = jwt.sign(unsignedToken, MB_EMBEDDING_SECRET_KEY);
    // construct the URL of the iframe to be displayed
    const iframeUrl = `${MB_SITE_URL}/embed/dashboard/${signedToken}`;
    res.render("chart", { userId: req.params.id, iframeUrl: iframeUrl });
})

app.get("/signed_dashboard/:id", checkAuth, (req, res) => {
    const userId = req.session.userId;
    const unsignedToken = {
        resource: { dashboard: DASHBOARD_ID },
        params: { user_id: userId }
    };
    // sign the JWT token with our secret key
    const signedToken = jwt.sign(unsignedToken, MB_EMBEDDING_SECRET_KEY);
    // construct the URL of the iframe to be displayed
    const iframeUrl = `${MB_SITE_URL}/embed/dashboard/${signedToken}`;
    res.render("dashboard", { userId: req.params.id, iframeUrl: iframeUrl });
})

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT + "!");
});
