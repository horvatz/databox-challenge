const express = require("express");
const app = express();
const dotenv = require("dotenv").config();

const port = 8080;

const { google } = require("googleapis");
const Databox = require("databox");
const mongoose = require("mongoose");

const client = new Databox({
  push_token: process.env.DATABOX_TOKEN,
});

// MongoDB database for storing log

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      family: 4,
    });
    console.log("DB connected!\n");
  } catch (error) {
    console.log(error);
  }
};

const CronJob = require("cron").CronJob;
const oauth2Client = require("./auth/oauth");
const Event = require("./model/Event");

app.set("view engine", "ejs");

app.listen(port, () => console.log(`Listening on port ${port}\n`));

async function main() {
  await connectToDB();

  let google_connected = false;
  let github_connected = false;

  // Google YouTube Analytics API integration

  const yt = google.youtubeAnalytics({
    version: "v2",
    auth: oauth2Client,
  });

  // Generate OAuth2 login url for YouTube API

  const getConnectionUrl = () => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
    });
    return url;
  };

  // Fetch metrics from YouTube API

  const fetchYtData = async () => {
    try {
      const result = await yt.reports.query({
        endDate: "2030-01-01",
        ids: "channel==MINE",
        metrics: "views,comments,likes,dislikes,averageViewDuration",
        startDate: "2000-01-01",
      });
      return result.data;
    } catch (error) {
      console.log(error);
    }
  };

  // Send fetched data to Databox and save result to log in MongoDB

  const sendYtData = (data) => {
    client.insertAll(
      [
        {
          key: "yt_views",
          value: data.rows[0][0],
        },
        {
          key: "yt_comments",
          value: data.rows[0][1],
        },
        {
          key: "yt_likes",
          value: data.rows[0][2],
        },
        {
          key: "yt_dislikes",
          value: data.rows[0][3],
        },
        {
          key: "yt_average_watch_time",
          value: data.rows[0][4],
        },
      ],
      (res) => {
        const event = new Event({
          service: "YouTube",
          kpis: data.rows[0].length,
          metrics: [
            "yt_views",
            "yt_comments",
            "yt_likes",
            "yt_dislikes",
            "yt_average_watch_time",
          ],
        });

        if (res.status === "OK") {
          event.successful = true;
        } else {
          event.successful = false;
          event.error.status = res.status;
          event.error.message = res.message;
        }

        console.log(res);
        event.save((err, event, rows) =>
          console.log("Data will be push again next hour!\n")
        );
      }
    );
  };

  console.log(`Login to Google: ${getConnectionUrl()}\n`);
  console.log("");
  console.log("Visit dashboard at http://localhost:8080\n");

  // Get data from sending log from MongoDB

  const getLogData = async () => {
    const log = await Event.find();
    return log;
  };

  // Routes for web interface

  app.get("/", async (req, res) => {
    let google_url = "";
    if (!google_connected) google_url = getConnectionUrl();
    const data = await getLogData();
    res.render("pages/dashboard", {
      google_connected,
      github_connected,
      data,
      github_repo: process.env.GITHUB_REPO,
      google_url,
    });
  });

  app.get("/auth/google", async (req, res) => {
    try {
      const { tokens } = await oauth2Client.getToken(req.query.code);
      oauth2Client.setCredentials(tokens);
      google_connected = true;
      res.redirect("/auth/google/success");
    } catch (error) {
      res.send(error);
    }
  });

  app.get("/auth/google/success", async (req, res) => {
    try {
      const data = await fetchYtData();
      sendYtData(data);
      jobYT.start();
      console.log("Google YouTube Analytics API connected!\n");
      res.render("pages/google-success");
    } catch (error) {
      res.send(error);
    }
  });

  // Github API integration

  const { Octokit } = require("@octokit/core");
  const { createTokenAuth } = require("@octokit/auth-token");

  const auth = createTokenAuth(process.env.GITHUB_TOKEN);

  // Authenticate GitHub with perosnal access token in .env file

  const getGithub = async () => {
    try {
      const { token } = await auth();
      console.log("Github API connected!\n");
      return new Octokit({
        auth: token,
      });
    } catch (error) {
      console.log(error);
    }
  };

  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  // Fetch metrics from Github API for selected repository in .env file
  // and return it

  const fetchGhData = async () => {
    try {
      const octokit = await getGithub();
      const {
        data: { login },
      } = await octokit.request("GET /user");
      const repoData = await octokit.request("GET /repos/{owner}/{repo}", {
        owner: login,
        repo: process.env.GITHUB_REPO,
      });

      const repoStats = {
        open_issues: repoData.data.open_issues,
        stargazers_count: repoData.data.stargazers_count,
        forks_count: repoData.data.forks_count,
        watchers_count: repoData.data.watchers_count,
      };
      return repoStats;
    } catch (error) {
      console.log(error);
    }
  };

  // Send fetched Github data to Databox and save result to log in MongoDB

  const sendGhData = (data) => {
    client.insertAll(
      [
        {
          key: "gh_open_issues",
          value: data.open_issues,
        },
        {
          key: "gh_stars",
          value: data.stargazers_count,
        },
        {
          key: "gh_forks",
          value: data.forks_count,
        },
        {
          key: "gh_watchers",
          value: data.watchers_count,
        },
      ],
      (res) => {
        const event = new Event({
          service: "GitHub",
          kpis: Object.keys(data).length,
          metrics: ["gh_open_issues", "gh_stars", "gh_forks", "gh_watchers"],
        });

        if (res.status === "OK") {
          event.successful = true;
        } else {
          event.successful = false;
          event.error.status = res.status;
          event.error.message = res.message;
        }

        console.log(res);
        event.save((err, event, rows) =>
          console.log("Data will be pushed again next hour!\n")
        );
      }
    );
  };

  // Schedule cron jobs for periodic sending data to Databox
  // Sending data is set for every hour

  const jobGH = new CronJob("0 * * * *", async () => {
    const data = await fetchGhData();
    sendGhData(data);
  });

  const jobYT = new CronJob("0 * * * *", async () => {
    const data = await fetchYtData();
    sendYtData(data);
  });

  // Start fetching Github data and schedule job

  fetchGhData()
    .then((data) => {
      sendGhData(data);
      github_connected = true;
      jobGH.start();
    })
    .catch((error) => console.log(error));
}

main();
