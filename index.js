// import jwtDecode from "jwt-decode";
const {
  TableClient,
  TableServiceClient,
  AzureNamedKeyCredential,
} = require("@azure/data-tables");
const jwtDecode = require("jwt-decode");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
// let date = Date.now()
// console.log(date);
// console.log(Date.parse(1657588049));
//
// testing api shit
//
// let testToken =
//   "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ilg1ZVhrNHh5b2pORnVtMWtsMll0djhkbE5QNC1jNTdkTzZRR1RWQndhTmsifQ.eyJleHAiOjE2NTc1ODgwNDksIm5iZiI6MTY1NzU4NDQ0OSwidmVyIjoiMS4wIiwiaXNzIjoiaHR0cHM6Ly9kcjNhbXNwYWNlLmIyY2xvZ2luLmNvbS8yNzUwY2JjOC05NTRlLTRjYTUtYjQ4ZS1jZTBkYjRiZDVlZWEvdjIuMC8iLCJzdWIiOiIwZmQ0NWQzYi02ZGIzLTRmNGMtYjY0NS0xZmMzNDVjOTE4ZjciLCJhdWQiOiIwNWNlMmVmOC1jZjYyLTQ0NDItYTE3OC1kOGNlZjQ3NDA1YjAiLCJub25jZSI6IjZjOGQ3ZGMwLTE5MDAtNDRjOC1hZjkxLTU0NjQ2OWEwZjg3YSIsImlhdCI6MTY1NzU4NDQ0OSwiYXV0aF90aW1lIjoxNjU3NTg0NDQ2LCJvaWQiOiIwZmQ0NWQzYi02ZGIzLTRmNGMtYjY0NS0xZmMzNDVjOTE4ZjciLCJnaXZlbl9uYW1lIjoiaXZhbiIsInRmcCI6IkIyQ18xX2VtYWlsX2FuZF9nb29nbGUifQ.blexRadRHxsOc8IK0xdikQr-2sxxAgd1pq2TEwMVS0PzzPjslfEqHSryl_MiYFo6FPHe8fPrShmm3uEK_SYnc9cju7ou2DYJS942xPqqiV83B-8uBkdgim9qz9jD71RXJZ34KCv9pV5aIQ-1X3CWOQ5QIuLMRx5u7sTS1JLKysbd2t_GvWzG32FtN2UiOrb7J8at3nOhREXsvJThjW7C8lOtPkv2WEPs-WVEu6kpMhWEb4440bvbFGwYDX6wjRBErPWgbWrKfVsqr9yFUv2gD_M5Hwl9Tdwlm8du8GwMGdzJAyai4k18ZhojlHKxpN1haVhklLEcfGvzhpXmnGqJAw";
// let decodedTestToken = jwtDecode(testToken);
// console.log(decodedTestToken);

// if(1657588049 < new Date()/1000) console.log('expired');
// else console.log('not expired');

// DOCS LMAO
//
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

// tableServiceClient.createTable('mytable');
// utility functions
// TODO: spin these off into separate files when they work
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

app.get("/", function (req, res) {
  res.json({ status: "api active" });
});

// the dream creation endpoint
app.post("/dream", cors(), async function (req, res) {
  console.log("request");
  console.log(req);
  console.log("auth token");
  console.log(req.headers.authorization);
  // validate the auth token
  if (!validateAuthToken(req.headers.authorization)) {
    res.statusCode = 401;
    res.json({ status: "invalid token" });
  }
  // validate the dream object that comes in the request body
  let newDream = req.body;
  console.log(req.body);
  if (!validateDreamContent(newDream)) {
    res.statusCode = 400;
    res.json({ status: "malformed dream body" });
  }
  // add dream to storage table
  var date = Date.now();
  var key = date + "-" + Math.ceil(Math.random() * 1000);
  newDream["partitionKey"] = "dreams";
  newDream["rowKey"] = key;
  let dreamCreateResult = await tableClient.createEntity(newDream);
  console.log("result of dream addition process:");
  console.log(dreamCreateResult);
  // TODO:  determine if this actually works lmao
  res.statusCode = 201;
  res.json({ status: "created", dreamId: key });
});

app.get("/i", function (req, res) {
  console.log(req.headers);
  let token = req.headers.authorization;
  let decodedToken = jwtDecode(token);
  if (
    decodedToken.iss ==
      `https://dr3amspace.b2clogin.com/2750cbc8-954e-4ca5-b48e-ce0db4bd5eea/v2.0/` &&
    decodedToken.aud == `05ce2ef8-cf62-4442-a178-d8cef47405b0` &&
    decodedToken.exp < new Date() / 1000
  ) {
    res.json({ status: "token checks out, authorized api call" });
  } else {
    res.json({ status: "token is expired, fuck you" });
  }
});

console.log("api started up: listening on port 3000");
app.listen(3000);
