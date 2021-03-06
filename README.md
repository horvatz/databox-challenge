# databox-challenge
 Service to integrate **YouTube Analytics API** and **GitHub API** with **Databox** written in **Node.js**. Data is send to Databox every hour using cron job.
 
 Service also logs every attempt to send data and save it to MongoDB database. You can see all the logs in dashboard.
 
 YouTube API uses **OAuth2** authentication and GitHub API uses **personal access token** with *repo* scope.
 
 ## Metrics traced :chart_with_upwards_trend:
 ### YouTube Analytics:
 Uses Google OAuth2 authenticaion
 * ***yt_views***: all views on specific channel
 * ***yt_comments***: all comments on specific channel
 * ***yt_likes***: all likes on specific channel
 * ***yt_dislikes***: all dislikes on specific channeč
 * ***yt_average_watch_time***: average watch time on all videos
 
 ### GitHub API:
 Personal access token for authentication and repo is set in **.env file**.
 * ***gh_open_issues***: all open issues on specific repo
 * ***gh_stars***: all stars on specific repo
 * ***gh_forks***: all forks on specific repo
 * ***gh_watchers***: all watchers on specific repo

## Instructions :book:
Make sure you have **Node.js** and **npm package manager** installed. You also need **MongoDB** for logging send data.

Before you start you need to create ***.env file*** in main directory with following structure:
```
DATABOX_TOKEN = your_databox_token
DB_CONNECT = your_mongo_db_connection_string
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GITHUB_TOKEN = your_personal_github_access_token
GITHUB_REPO = your_github_repo_to_watch
```
After that you can run service:
```
npm start
```
That's it.

You can see status of service in console. GitHub API is automatically connected if you provided right repo and token in .env file. To see log and login to YouTube API using OAuth2 open dashboard in your web browser at: http://localhost:8080

Data will be pushed to Databox on authentication and then **every hour**. You can change that in **jobYT** function for YouTube Analytics API and in **jobGH** for GitHub API.
