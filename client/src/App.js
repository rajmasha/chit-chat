import React from 'react';
import './App.css';
import useSocket from './hooks/useSocket';
import Home from './components/Home';
import Login from './components/Login';


const App = () => {

    const client = useSocket();

    return (
        <div className="app">
            { client.user ? <Home client={client} /> : <Login logIn={client.logIn} />}
        </div>
    );

}

export default App;