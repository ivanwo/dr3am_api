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
//  ! ! ! ! ! ! !
//  !   SETUP   !
//  ! ! ! ! ! ! !
const app = express();
// app.use(express.urlencoded());
app.use(express.json());
app.use(cors());

// TODO: parameterize these into environment variables
const tableCredential = new AzureNamedKeyCredential(
  "sadr3amspace",
  "LgATTCXQjEGD6bd7jkmHrbGVMvpYqmpSLakNeW07SnqWpqVrRTCesjRaUhTR8/IUFt2mO89DenN4+ASt/nBlow=="
);
const tableUrl = "https://sadr3amspace.table.core.windows.net/";
const tableName = "ivantest";

// table client is for manipulating data in a table
const tableClient = new TableClient(tableUrl, tableName, tableCredential);
// table SERVICE client is for creating and deleting tables
const tableServiceClient = new TableServiceClient(tableUrl, tableCredential);
// some of that is rather unhelpfully explained in the following docs:
// https://docs.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-nodejs

//  ! ! ! ! ! ! ! !
//  !  UTILITIES  !
//  ! ! ! ! ! ! ! !
// TODO: spin these off into separate files when they actually work
let validateAuthToken = (authToken) => {
  // decode token. if invalid, error
  // check expiration date. if expired, error
  // check audience. if invalid, error
  // check audience. if invalid, error
  return true;
  // LMAOOOO
};

let validateDreamContent = (_) => {
  // parse dream for any hate speech, slurs, invalid text, etc
  // check if user has submitted too many in the time period
  return true;
  // :P
};

//  ! ! ! ! ! ! !
//  !  ROUTES   !
//  ! ! ! ! ! ! !
// default endpoint, functions as health check
app.get("/", function (req, res) {
  res.json({ status: "api active" });
});

// dream creation
app.post("/dream", cors(), async function (req, res) {
  // validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
  }
  // validate the dream object that comes in the request body
  let newDream = req.body;
  if (!validateDreamContent(newDream)) {
    res.statusCode = 400;
    res.json({ status: "malformed dream" });
  }
  // add dream to storage table
  var date = Date.now();
  var key = date + "-" + Math.ceil(Math.random() * 1000); // TODO: get better guiding system, this is TRASH lol
  newDream["partitionKey"] = "dreams";
  newDream["rowKey"] = key;
  let dreamCreateResult = await tableClient.createEntity(newDream);
  // TODO:  return 409 if the data already exists in the SA
  res.statusCode = 201;
  res.json({ status: "created", dreamId: key });
});

// get a specific dream based on dream partition key
app.get("/dream/:id", cors(), async function (req, res) {
  //validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
  }
  // get dream id from url
  let dreamId = req.params.id;
  try {
    // get dream from storage account
    let dreamFetchResult = await tableClient.getEntity("dreams", dreamId);
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
  }
  let entities = tableClient.listEntities();
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
  }
  // okay so this one is weirder, to get table entities that match a specific query we have to tunnel into the options a little bit and use
  // the fucking "OData filter expressions i hate so much"
  // docs: https://www.odata.org/getting-started/basic-tutorial/
  let entities = tableClient.listEntities({
    queryOptions: { filter: "location eq 'detroit' " },
  });
  try {
    let dreamList = [];
    for await (const entity of entities) {
      dreamList.push(entity);
    }
    res.statusCode = 200;
    res.json({ dreams: dreamList });
  } catch {
    res.statusCode = 500;
    res.json({ status: "problem" });
  }
});

app.get("/user/:id", async function(req, res){
    // TODO: we need a user table, and possibly a recurring automation task that syncs it with the azure AD listing of users
    res.statusCode = 501;
    res.json({status: "not implemented"});
})

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
    decodedToken.exp < new Date() / 1000 // TODO: figure out what's screwy with the date comparison here. Unix UTC timecode vs node default?
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
