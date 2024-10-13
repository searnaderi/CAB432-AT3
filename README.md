# VideoSharingProject

# How to use:
Firstly, the application is divided into two main parts, backend and frontend.
backend is an Express application, the main entry point is the app.js file additionally, the knexfile.js configures connection
to the MySQL database. The routes folder consists of different routes like videos, comments, and playlists and includes all the API and endpoint codes. There is also an .env file for storing environment variables

The frontend is a React application. In the frontend folder, there is the pages folder which consists of all the pages of the application. There's also helper folder which stores helper functions used throughout the application. Additionally, there is a css folder which has all the css files used throughtout the application. There's an .env file here as well for storing env variables. The main entry point is in App.js here I've made the routes and the navgiation bar.

For local development, copy the schema.sql file into MySQL workbench and excute the code in there, this will install necessary tables and schemas, install MySQL workbench (if you do not have it).
Next, go into backend directory, and run npm install first and then npm start, server will run on port 3000
then go into frontend directory and npm install first run npm start, client React app will run on port 5000
Next, open up another terminal and sign in to AWS sso, using aws configure sso.
Boom! Everything should be working fine.