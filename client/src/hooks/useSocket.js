import { useEffect, useState } from "react";
import io from 'socket.io-client';

const socket = io("http://localhost:4000", { autoConnect: false });

const useSocket = () => {

    let u, a;
    const [user, setUser] = useState();
    const [users, setUsers] = useState();
    const [rooms, setRooms] = useState();
    const [chat, setChat] = useState({});

    const [userTyping, setUserTyping] = useState();
    const [typingTimer, setTypingTimer] = useState();


    useEffect(() => {
        
        // get session and connect with session as auth
        const sessionId = sessionStorage.getItem("sessionId");
        if (sessionId) {
            socket.auth = { sessionId };
            socket.connect();
            console.log("Trying to reconnect with sessionId");
        }


        socket.on("connect", () => {
            console.log("Connected to server successfully");
            
            if (!sessionId)
                socket.emit("user", { username: u, avatar: a });

            socket.emit("setUpUser");
        });


        socket.on("session", ({ sessionId, userId }) => {
            socket.auth = { sessionId };
            sessionStorage.setItem("sessionId", sessionId);
            socket.userId = userId;
        });


        socket.on("user", (sUser) => {
            setUser(sUser);
        });


        socket.on("users", (sUsers) => {
            setUsers(sUsers);
        });


        socket.on("rooms", (sRooms) => {
            setRooms(sRooms);
        });


        socket.on("room", (roomId) => {
            setUser(prevUser =>  ({...prevUser, roomId: roomId}));
        });


        socket.on("chat", (message) => {
            setChat(prevchat => ({
                ...prevchat, 
                [message.room]: {
                    messages: [...prevchat[message.room]?.messages || [], message],
                    unread: (prevchat[message.room]?.unread || 0) + (message.type === "message" ? 1 : 0)
                    }
                })
            );
        });


        socket.on("typing", (username) => {
            setUserTyping(username);
        });


        socket.on("stoppedTyping", () => {
            setUserTyping(null);
        });


        return () => {
            console.log("Disconnected from server");
            socket.disconnect();
        }

    }, []);

 

    const logIn = ({ username, avatar }) => {
        u = username;
        a = avatar;
        socket.auth = { username };
        socket.connect();
    }


    const logOut = () => {
        setUser(null);
        sessionStorage.removeItem("sessionId");
        socket.disconnect();
        console.log("User logged out");
    }


    const sendMessage = (message) => {
        socket.emit("message", message);
    }


    const createRoom = (roomName) => {
        console.log("emit createRoom");
        socket.emit("createRoom", roomName);
    }


    const updateRoom = (roomId) => {
        
        socket.emit("updateRoom", roomId);

        setChat(prevchat => ({
                ...prevchat, 
                [user.roomId]: {
                    ...prevchat[user.roomId],
                    unread: 0
                },
                [roomId]: {
                    ...prevchat[roomId],
                    unread: 0
                }
            })
        );
    }


    const deleteRoom = (roomId) => {
        socket.emit("deleteRoom", roomId);
    }


    const typing = () => {
        socket.emit("typing");
        clearTimeout(typingTimer);
        setTypingTimer(null);
    }


    const stoppedTyping = () => {
        if (typingTimer == null) {
            setTypingTimer(setTimeout(() => {
                socket.emit("stoppedTyping");
            }, 300));
        }
    }


    const logStates = ({ showUser=false, showUsers=false, showRooms=false, showChat=false }) => {
        if (showUser) console.log(user);
        if (showUsers) console.log(users);
        if (showRooms) console.log(rooms);
        if (showChat) console.log(chat);
    }


    return { 
        socket, 
        user, 
        users, 
        chat,
        setChat,
        rooms, 
        logIn, 
        logOut, 
        sendMessage, 
        createRoom, 
        updateRoom, 
        deleteRoom, 
        typing,
        stoppedTyping,
        userTyping,
        logStates 
    };

}

export default useSocket;