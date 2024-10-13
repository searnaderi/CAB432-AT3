// Imports
const S3 = require("@aws-sdk/client-s3");

// Deployment on EC2
// let knex;
// (async () => {
//     const knexConfig = require('./knexfile.js');
//     knex = require('knex')(await knexConfig());
// })();

// For local development
const configurations = require('./knexfile.js');
const knex = require('knex')(configurations);

const cors = require('cors');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const usersRouter = require('./routes/user');
const videosRouter = require('./routes/videos');
const youtubeRouter = require('./routes/youtube')
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes')
const playlistsRouter = require('./routes/playlists');
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const getParameter = require("./helper/parameterStore.js");
require('dotenv').config();
const s3Client = new S3.S3Client({ 
    region: 'ap-southeast-2'});
// Create server
const server = http.createServer(app);

// Create socket connection
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST'] // Only allow get and post requests for socket connection
    },
	connectionStateRecovery: {
		// the backup duration of the sessions and the packets
		maxDisconnectionDuration: 2 * 60 * 1000,
		skipMiddlewares: true,
	  },
});

// Connection with socket
io.on('connection', (socket) => {
	socket.on('disconnect', (reason) => {
        console.log('User disconnected:', socket.id, 'Reason:', reason);
    });
});

// Allow requests only from the frontend
app.use(cors({
	origin: "*",
	methods: 'GET,POST,PUT,DELETE',
	credentials: true, // Allow cookies to be sent and received
	allowedHeaders: 'Content-Type,Authorization'
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Middleware for database connectivity
app.use((req, res, next) => {
	req.db = knex;
	next();
});

// Middleware for storing io object to req for subsequent use in other endpoints
app.use((req, res, next) => {
	req.io = io;
	next();
  });

// Register different middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Register all routes

// Simple get route getting Base API
app.get('/getBaseAPI', async function(req, res, next){
	const parameter_name = "/n11736062/baseAPI";
	try{
		const response = await getParameter(parameter_name);
		res.status(200).json({
			baseAPI: response 
		})
	}catch(error){
		res.status(500).json({error : true, message : "Error while fetching baseAPI."})
		
	}
})

// Helper function checking if video exists in S3
async function checkIfVideoExists(key) {
    try {
        const command = new S3.HeadObjectCommand({
            Bucket: process.env.BUCKETNAME,
            Key: key
        });
        const response = await s3Client.send(command);
        return true;
    } catch (error) {
        return false;
    }
}

// Helper function for checking if a journal entry is outdated
function isOutdated(timestamp) {
    const dateToCheck = new Date(timestamp);
    const now = new Date(); 
	// 30 minutes in miliseconds
    const thirtyMinutesInMillis = 30 * 60 * 1000; 
    const difference = now - dateToCheck;
    return difference > thirtyMinutesInMillis; 
}

// Function for checking incomplete journals and taking subsequent actions 
async function checkIncompleteJournals() {
    const journalRecords = await knex('journal').select('*');
    for (const record of journalRecords) {
        const { id, filename, created_at } = record;
        // Check if the object exists in S3
        const objectExists = await checkIfVideoExists(process.env.BUCKETNAME, filename);
        // Delete journal entries if journal is over 30 minutes old or object does not exist in S3
        if (!objectExists && isOutdated(created_at)) {
            await knex('journal').where({ id }).del();
        // If object exists, it's before user pressed save which links the video file to the database
        } else if (objectExists) {
            // If object exists delete from S3
            const deleteCommand = await s3Client.send(
                new S3.DeleteObjectCommand({
                    Bucket: process.env.BUCKETNAME,
                    Key: `videos/${filename}`,
                })
            );
            // Delete journal entry 
            await knex('journal').where({ id }).del();
        }
    }
}
// Run check every 5 minutes;
setInterval(checkIncompleteJournals, 5 * 60 * 1000);

app.use('/videos', videosRouter);
app.use('/user', usersRouter);
app.use('/youtube', youtubeRouter);
app.use('/comments', commentsRouter);
app.use('/playlists', playlistsRouter);
app.use('/likes', likesRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});


module.exports = {app, server};