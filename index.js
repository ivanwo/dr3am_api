// import jwtDecode from "jwt-decode";
const { TableServiceClient, AzureNamedKeyCredential } = require("@azure/data-tables");
const jwtDecode = require("jwt-decode");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors())
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
// https://docs.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-nodejs
//
const tableService = new TableServiceClient(
    "https://sadr3amspace.table.core.windows.net/",
    new AzureNamedKeyCredential("sadr3amspace", "LgATTCXQjEGD6bd7jkmHrbGVMvpYqmpSLakNeW07SnqWpqVrRTCesjRaUhTR8/IUFt2mO89DenN4+ASt/nBlow==")
  );

// tableService.createTable('mytable');

app.get("/", function (req, res) {
    res.json({ status: ":P"});
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
    res.json({ status: "token checks out, authorized api call"});
  }
  else {
    res.json({ status: "token is expired, fuck you"});
  }
});

console.log("api started up: listening on port 3000");
app.listen(3000);
