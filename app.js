//var accountRouter = require("./routes/auth");

const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const express = require('express');
const mysql = require('mysql');
const formatMessage = require('./utils/messages.js');
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users.js');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const mongo = require('mongodb');
const conn = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'',
    insecureAuth:true
})



const MongoClient = mongo.MongoClient;
const url = 'mongodb://localhost:27017/';


//app.use("/account", accountRouter);
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'LetsChat Bot';

io.on('connection', socket => {

    socket.on('joinRoom', ({username, room})=>{
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // Welcome message
        socket.emit('message', formatMessage(botName, 'Welcome to LetsChat!'));

        // broadcast when user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName,`${user.username} connected`));

        io.to(user.room).emit('roomUsers', {room: user.room,users: getRoomUsers(user.room)});
    });
    
   
    const insertDocument = (db, callback) =>{
        // Listen for chat message
        socket.on('chatMessage', msg =>{
            const user = getCurrentUser(socket.id);
            io.to(user.room).emit('message', formatMessage(user.username,msg));
        
        var collection = db.collection('chatmessages');
        collection.insert(formatMessage(user.username,msg) , function(err, result) {
            if (err) { console.warn(err.message); }
            else { console.log("chat message inserted into db"); }
            callback(result);
        });
    });

        
    }
    socket.on('disconnect', ()=>{
        const user = userLeave(socket.id);

        if(user){
            io.to(user.room).emit('message', formatMessage(botName,`${user.username} has left the chat`));

            io.to(user.room).emit('roomUsers', {room: user.room,users: getRoomUsers(user.room)});
        }
    });
    
    MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, (err, database)=>{
        if(err) throw err;
        const db = database.db('LetsChat')
        insertDocument(db, () =>{});
    });
});



const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`)
});
