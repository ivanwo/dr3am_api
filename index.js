//  ! ! ! ! ! ! !
//  !  IMPORTS  !
//  ! ! ! ! ! ! !
const {
  TableClient,
  TableServiceClient,
  AzureNamedKeyCredential,
} = require("@azure/data-tables");
const jwtDecode = require("jwt-decode");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
//  ! ! ! ! ! ! !
//  !   SETUP   !
//  ! ! ! ! ! ! !
const app = express();
// app.use(express.urlencoded());
app.use(express.json());
app.use(cors());

const tableCredential = new AzureNamedKeyCredential(
  process.env.STORAGE_ACCOUNT_NAME,
  process.env.STORAGE_ACCESS_TOKEN
);

// dream table client is for manipulating data in the dreams table
const dreamTableClient = new TableClient(
  process.env.STORAGE_ACCOUNT_URI,
  process.env.STORAGE_TABLE_NAME,
  tableCredential
);
// table client for interacting with user account data
const userTableClient = new TableClient(
  process.env.STORAGE_ACCOUNT_URI,
  "users",
  tableCredential
);
// table SERVICE client is for creating and deleting tables
const tableServiceClient = new TableServiceClient(
  process.env.STORAGE_ACCOUNT_URI,
  tableCredential
);
// some of that is rather unhelpfully explained in the following docs:
// https://docs.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-nodejs

//  ! ! ! ! ! ! ! !
//  !  UTILITIES  !
//  ! ! ! ! ! ! ! !
// TODO: spin these off into separate files when they actually work
let validateAuthToken = (authToken) => {
  let decodedToken;
  try {
    decodedToken = jwtDecode(authToken);
  } catch {
    // INVALID TOKEN, HASH DOESN'T CHECK OUT
    return false;
  }
  // console.log(decodedToken);
  //   TODO: parameterize these as environment vars? would that even be worth it?
  if (
    decodedToken.iss ==
      `https://dr3amspace.b2clogin.com/2750cbc8-954e-4ca5-b48e-ce0db4bd5eea/v2.0/` &&
    decodedToken.aud == `05ce2ef8-cf62-4442-a178-d8cef47405b0` &&
    decodedToken.exp > Date.now() / 1000
  )
    // VALID TOKEN
    return true;
  // INVALID TOKEN
  else return false;
};

let validateDreamContent = (dream) => {
  // check dream content and length
  if (
    dream.dreamtitle == null ||
    dream.dreamtitle.length < 4 ||
    dream.dreamtitle.length > 40 ||
    dream.dreamcontent == null ||
    dream.dreamcontent.length < 40 ||
    dream.dreamcontent.length > 400
  )
    return false;
  // parse dream for any hate speech, slurs, invalid text, etc
  // if (dream.dreamtitle.contains("")) {
  //   return false;
  // }
  // if (dream.dreamcontent.contains("")) {
  //   return false;
  // }
  // check if user has submitted too many in the time period
  return true;
  // :P
};

let getZodiacSign = (date) => {
  const days = [21, 20, 21, 21, 22, 22, 23, 24, 24, 24, 23, 22];
  // const signs = ["Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo",    "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"];
  // const signs = ["Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo",    "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"];
  const signs = [
    "♒︎",
    "♓︎",
    "♈︎",
    "♉︎",
    "♊︎",
    "♋︎",
    "♌︎",
    "♍︎",
    "♎︎",
    "♏︎",
    "♐︎",
    "♑︎",
  ];
  let month = date.getMonth();
  let day = date.getDate();
  if (month == 0 && day <= 20) {
    month = 11;
  } else if (day < days[month]) {
    month--;
  }
  return signs[month];
};

let validateUserAccount = (user) => {
  // verify length and location data is correct
  // TODO: that
  return true;
};
//  ! ! ! ! ! ! !
//  !  ROUTES   !
//  ! ! ! ! ! ! !
// default endpoint, functions as health check
app.get("/", function (req, res) {
  res.json({ status: "api active" });
});

//  ! ! ! ! ! ! !
//  !  DREAMS   !
//  ! ! ! ! ! ! !
// dream creation
app.post("/dream", cors(), async function (req, res) {
  // validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  // validate the dream object that comes in the request body
  let newDream = req.body;
  if (!validateDreamContent(newDream)) {
    res.statusCode = 400;
    res.json({ status: "malformed dream" });
    return;
  }
  // add dream to storage table
  var date = Date.now();
  var key = date + "-" + Math.ceil(Math.random() * 1000); // TODO: get better guiding system, this is TRASH lol
  newDream["partitionKey"] = "dreams";
  newDream["rowKey"] = key;
  let dreamCreateResult = await dreamTableClient.createEntity(newDream);
  // TODO:  return 409 if the data already exists in the SA
  res.statusCode = 201;
  res.json({ status: "created", dreamId: key });
});

// get a specific dream based on dream partition key
app.get("/dream/:id", cors(), async function (req, res) {
  //validate the auth token
  // console.log(req);
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  // get dream id from url
  let dreamId = req.params.id;
  try {
    // get dream from storage account
    let dreamFetchResult = await dreamTableClient.getEntity("dreams", dreamId);
    res.statusCode = 200;
    res.json(dreamFetchResult);
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem getting dream" });
  }
});

// get all dreams
app.get("/dreams", cors(), async function (req, res) {
  //validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  let entities = dreamTableClient.listEntities({
    queryOptions: { filter: "PartitionKey eq 'dreams'" },
  });
  //   this is an EXPENSIVE routine, we have to refine this and cache AS MUCH DATA AS POSSIBLE server side
  // though now that i consider, i wonder what hosting charges that might incur?
  // TODO: explore cheap deployment platform for workhorse api
  //   TODO: for "random" posts, perhaps there's another endpoint for public consumption with a much smaller pool?
  // that would also solve part of the access issues with having a landing page without exposing the core API tokenlessß
  try {
    let dreamList = [];
    for await (const entity of entities) {
      dreamList.push(entity);
    }
    if (dreamList.length > 1) dreamList.reverse();
    res.statusCode = 200;
    res.json({ dreams: dreamList });
    return;
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem" });
  }
});

// get all dreams by user
app.get("/dreams/:username", cors(), async function (req, res) {
  //validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  let username = req.params.username;
  // okay so this one is weirder, to get table entities that match a specific query we have to tunnel into the options a little bit and use
  // the fucking "OData filter expressions i hate so much"
  // docs: https://www.odata.org/getting-started/basic-tutorial/
  let entities = dreamTableClient.listEntities({
    queryOptions: { filter: `user eq '${username}'` },
  });
  try {
    let dreamList = [];
    for await (const entity of entities) {
      dreamList.push(entity);
    }
    if (dreamList.length > 1) dreamList.reverse();
    res.statusCode = 200;
    res.json({ dreams: dreamList });
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem" });
  }
});

// get geographical region specific dreams
// TODO: come up with a querying scheme that cuts down on the unnecessary processing
app.get("/dreams/geo", cors(), async function (req, res) {
  //validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  // okay so this one is weirder, to get table entities that match a specific query we have to tunnel into the options a little bit and use
  // the fucking "OData filter expressions i hate so much"
  // docs: https://www.odata.org/getting-started/basic-tutorial/
  let entities = dreamTableClient.listEntities({
    queryOptions: { filter: "location eq 'detroit'" },
  });
  try {
    let dreamList = [];
    for await (const entity of entities) {
      dreamList.push(entity);
    }
    if (dreamList.length > 1) dreamList.reverse();
    res.statusCode = 200;
    res.json({ dreams: dreamList });
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem" });
  }
});

//  ! ! ! ! ! ! !
//  !   USERS   !
//  ! ! ! ! ! ! !
app.get("/user", cors(), async function (req, res) {
  // validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
    return;
  }
  // return the full user profile only for the user the request is from
  let userId;
  try {
    userId = jwtDecode(req.headers.authorization);
  } catch {
    // couldn't decode token
    res.statusCode = 500;
    res.json({ status: "token problem" });
    return;
  }
  userId = userId.sub;

  console.log(userId);
  try {
    // get this user's data from storage account
    let userFetchResult = await userTableClient.getEntity("users", userId);
    // note: please use localAccountId from azure ad as the RowKey
    res.statusCode = 200;
    res.json(userFetchResult);
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem getting user", signupcompleted: false });
  }
});
// create entry for user in the user table of the SA
// post auth, mid sign up
app.post("/user", cors(), async function (req, res) {
  //validate the auth token
  // if (!validateAuthToken(req.headers.authorization)) {
  //   res.statusCode = 401;
  //   res.json({ status: "invalid token" });
  //   return;
  // }
  let user = req.body;
  // console.log(user);
  if (!validateUserAccount(user)) {
    res.statusCode = 400;
    res.json({
      status: `bad user data submitted. please rework or contact support.`,
      success: false,
    });
  }
  user.createdon = Date.now();
  user.PartitionKey = "users";
  user.signupcompleted = true;
  user.zodiac = getZodiacSign(new Date(user.birthday));
  try {
    let userCreateResult = await userTableClient.createEntity(user);
    res.statusCode = 201;
    res.json({
      status: `account for ${user.username} created successfully!`,
      sucess: true,
    });
    return;
  } catch {
    res.statusCode = 409;
    res.json({
      status: `problem creating user ${user.username}, please contact support with user id ${user.rowKey}`,
      success: false,
    });
  }
});

app.get("/username/:id", cors(), async function (req, res) {
  // TODO: route to validate usernames when creating account configurations
  // TODO: change auth flow to only collect email address during sign up, push collection of user account information
  //      out of azure ad and into the first login/ incomplete account session of the UI
  //validate the auth token
  // if (!validateAuthToken(req.headers.authorization)) {
  //   res.statusCode = 401;
  //   res.json({ status: "invalid token" });
  //   return;
  // }
  let username = req.params.id;
  console.log(`attempting to check username '${username}'`);
  let entities = await userTableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq 'users' and username eq '${username}'`,
    },
  });

  try {
    let userList = [];
    // console.log(entities);
    for await (const entity of entities) {
      userList.push(entity);
    }
    if (userList.length > 0) {
      res.statusCode = 409;
      res.json({
        status: false,
        message: `username '${username}' already exists`,
      });
      return;
    } else {
      res.statusCode = 200;
      res.json({ status: true, message: `username '${username}' available` });
    }
    return;
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem" });
  }
});

//  ! ! ! ! ! ! !
//  !    NEWS   !
//  ! ! ! ! ! ! !
// site news, update, blog posts, etc
app.get("/news", cors(), (req, res) => {
  // return top two or three news items?
  res.statusCode = 501;
  res.json({ status: "not implemented yet" });
});

//  ! ! ! ! ! ! ! ! ! ! !
//  !   NOTIFICATIONS   !
//  ! ! ! ! ! ! ! ! ! ! !
// endpoints to check if the user has any notifications.
// could roll this into the signed in user specific GET above?

// test endpoint to validate jwt token
app.get("/jwt", function (req, res) {
  // check if token is valid
  let decodedToken;
  try {
    let token = req.headers.authorization;
    decodedToken = jwtDecode(token);
  } catch {
    res.statusCode = 400;
    res.json({ status: "invalid token" });
    return;
  }
  if (
    decodedToken.iss ==
      `https://dr3amspace.b2clogin.com/2750cbc8-954e-4ca5-b48e-ce0db4bd5eea/v2.0/` &&
    decodedToken.aud == `05ce2ef8-cf62-4442-a178-d8cef47405b0` &&
    decodedToken.exp < Date.now() / 1000 // TODO: figure out what's screwy with the date comparison here. Unix UTC timecode vs node default?
  ) {
    res.json({ status: "token checks out, authorized api call" });
  } else {
    res.json({ status: "token is expired, fuck you" });
  }
});

// FALLBACK ROUTE
app.get("*", function (req, res) {
  res.statusCode = 404;
  res.json({ status: "route not found" });
});

console.log("api started up: listening on port 3000");
app.listen(3000);
// TODO: set up any logging at all for insights into what's going on once we hit the server side
// TODO: set up caching on GET routes to ensure we're not slamming the storage account with requests for data we got 0.25 seconds ago
// https://medium.com/the-node-js-collection/simple-server-side-cache-for-express-js-with-node-js-45ff296ca0f0
