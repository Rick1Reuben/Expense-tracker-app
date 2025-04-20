import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import ExpensePage from './components/ExpensePage';
import PieChartPage from './components/PieChartPage';
import GraphPage from './components/GraphPage';
import Register from './components/Register';
import Login from './components/Login';
import Profile from './components/Profile';
import './App.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token);
        setLoadingSession(false);
    }, []);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true); // Update the state upon successful login
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setIsLoggedIn(false);
    };

    if (loadingSession) {
        return <div>Checking session...</div>;
    }

    return (
        <Router>
            <div className="app">
                <nav>
                    <ul>
                        {isLoggedIn ? (
                            <>
                                <li><Link to="/expenses">Expenses</Link></li>
                                <li><Link to="/pie-chart">Pie Chart</Link></li>
                                <li><Link to="/graphs">Graphs</Link></li>
                                <li><Link to="/profile">Profile</Link></li>
                            </>
                        ) : (
                            <>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/register">Register</Link></li>
                            </>
                        )}
                    </ul>
                </nav>

                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} /> {/* Pass the callback */}

                    <Route path="/expenses" element={isLoggedIn ? <ExpensePage /> : <Navigate to="/login" />} />
                    <Route path="/pie-chart" element={isLoggedIn ? <PieChartPage /> : <Navigate to="/login" />} />
                    <Route path="/graphs" element={isLoggedIn ? <GraphPage /> : <Navigate to="/login" />} />
                    <Route path="/profile" element={isLoggedIn ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />} />

                    <Route path="/" element={isLoggedIn ? <Navigate to="/expenses" /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;