
const app = require('express')();
const http = require('http').createServer(app);
const { v4: uuidv4 } = require('uuid');
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});

// global server states
const sessions = new Map();
const globalRoomId = uuidv4();
var users = [];
let rooms = [{ 
    id: globalRoomId,
    name: "Global", 
    userId: 0,
    username: "None", 
    avatar: "https://semantic-ui.com/images/avatar2/small/patrick.png",
    members: [],
}];


io.use((socket, next) => {
    
    console.log("io.use() running");

    const sessionId = socket.handshake.auth.sessionId;

    if (sessionId) {

        const session = sessions.get(sessionId);
        
        if (session) {
            
            console.log("Use existing user from session", sessionId);
            socket.sessionId = sessionId;
            socket.userId = session.userId;
            socket.username = session.username;
            socket.avatar = session.avatar;
            socket.roomId = session.roomId;

            return next();
        }        
    }

    console.log("Create new user");
    socket.sessionId = uuidv4();
    socket.userId = uuidv4();
    socket.username = socket.handshake.auth.username;;
    socket.roomId = globalRoomId;

    next();
});


io.on('connection', (socket) => {

    console.log("Connected to client successfully");

    // return session data to client once client is connected
    socket.emit("session", {
        sessionId: socket.sessionId,
        userId: socket.userId
    });



    // receive username and avatar from client once client is connected
    socket.on("user", ({ username, avatar }) => {
        socket.username = username
        socket.avatar = avatar;
    });



    // this function is run everytime client connects or reconnects
    // setup the client by adding to users array, joining room and send back user info to client
    socket.on("setUpUser", () => {

        const user = { 
            userId: socket.userId, 
            username: socket.username, 
            avatar: socket.avatar, 
            roomId: socket.roomId 
        };

        users.push(user);
        socket.join(socket.roomId);

        sessions.set(socket.sessionId, user);

        socket.emit("user", user);

        rooms.map(room => {
            if (room.id === socket.roomId) {
                room.members.push(socket.username);
            }
            return room;
        });

        const message = {
            type: "info",
            room: socket.roomId,
            content: socket.username + " has joined room",
        }
        
        socket.broadcast.to(globalRoomId).emit("chat", message);

        io.sockets.emit("users", users);
        io.sockets.emit("rooms", rooms);
        
    });




    socket.on("createRoom", (roomName) => {
        console.log("creating room", roomName);
        const room = {
            id: uuidv4(),
            name: roomName,
            username: socket.username,
            userId: socket.userId,
            avatar: socket.avatar,
            members: [],
        }
        rooms.push(room);
        socket.join(room.id);
        io.sockets.emit("rooms", rooms);
    });





    socket.on("updateRoom", (roomId) => {
        
        console.log("updating room");

        // if same room then ignore
        if (socket.roomId === roomId) return;

        let msg = {};

        // broadcast "left room" to all other users of previous room of user
        msg = {
            type: "info",
            room: socket.roomId,
            content: socket.username + " has left room",
        }

        socket.broadcast.to(socket.roomId).emit("chat", msg);


        // remove username of disconnected user from all rooms member list
        rooms.map(room => {
            if (room.members.includes(socket.username)) {
                let index = room.members.indexOf(socket.username);
                if (index !== -1) room.members.splice(index, 1);
            }
            return room;
        });

        // // remove rooms created by diconnected user from rooms list if all members left room
        rooms = rooms.filter(room => {
            let u = users.find(user => user.userId === room.userId);
            if (room.members.length > 0 || u || room.id === globalRoomId) {
                return room;
            }
        });

        // send new room to client to update local state
        socket.emit("room", roomId);
        

        if (socket.rooms.has(roomId)) {
            
            // Already member of room. just changing active room
            socket.roomId = roomId;

            msg = {
                type: "info",
                room: socket.roomId,
                content: socket.username + " has entered room",
            }

            socket.broadcast.to(socket.roomId).emit("chat", msg);


            // store username in new room members list
            rooms.map(room => {
                if (room.id === socket.roomId) {
                    room.members.push(socket.username);
                }
                return room;
            });

            io.sockets.emit("rooms", rooms);


            let user = { 
                userId: socket.userId, 
                username: socket.username, 
                avatar: socket.avatar, 
                roomId: socket.roomId 
            };
    
            sessions.set(socket.sessionId, user);

            return;
        }



        if (rooms.some(room => room.id === roomId)) {
            socket.roomId = roomId;
            socket.join(roomId);
        }
        else {
            socket.roomId = globalRoomId;
            socket.join(globalRoomId);
        }

        // check if there is no duplicate entry of users in same room
        rooms.map(room => {
            if (room.id === socket.roomId) {
                room.members.push(socket.username);
            }
            return room;
        });
        
        msg = {
            type: "info",
            room: socket.roomId,
            content: socket.username + " has joined room",
        }

        socket.broadcast.to(socket.roomId).emit("chat", msg);

        io.sockets.emit("rooms", rooms);


        user = { 
            userId: socket.userId, 
            username: socket.username, 
            avatar: socket.avatar, 
            roomId: socket.roomId 
        };

        sessions.set(socket.sessionId, user);

    });



    socket.on("deleteRoom", (roomId)=> {
        console.log("roomid", roomId);
        rooms = rooms.filter(room => room.id !== roomId);
        io.sockets.emit("rooms", rooms);
    });



    socket.on("message", (message) => {
        
        const msg = {
            type: "message",
            room: socket.roomId,
            userId: socket.userId,
            username: socket.username,
            avatar: socket.avatar,
            content: message,
            date: new Date(),
        }

        io.sockets.to(socket.roomId).emit("chat", msg);

    });
    


    socket.on("typing", () => {
        io.sockets.to(socket.roomId).emit("typing", socket.username);
    });




    socket.on("stoppedTyping", () => {
        io.sockets.to(socket.roomId).emit("stoppedTyping");
    });



    socket.on("disconnect", () => {
        
        console.log("disconnect: user disconnected");

        // remove disconnected user from users list
        users = users.filter(user => user.userId !== socket.userId);


        // remove username of disconnected user from all rooms member list
        rooms.map(room => {
            if (room.members.includes(socket.username)) {
                let index = room.members.indexOf(socket.username);
                if (index !== -1) room.members.splice(index, 1);
            }
            return room;
        });

        const message = {
            type: "info",
            content: socket.username + " went offline",
        }

        socket.broadcast.to(socket.roomId).emit("chat", message);

        io.sockets.emit("users", users);
        io.sockets.emit("rooms", rooms);
    });

});



http.listen(4000, () => {
    console.log("Connected to port 4000");
});