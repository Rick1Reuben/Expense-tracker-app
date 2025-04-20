import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile({ onLogout }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [salary, setSalary] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const getAuthHeader = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setError('');
            try {
                const response = await fetch('http://127.0.0.1:5000/profile', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeader(), // Include the JWT header
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    setError(errorData.error || 'Failed to fetch profile data.');
                    return;
                }

                const data = await response.json();
                setUsername(data.username);
                setEmail(data.email);
                setSalary(data.salary || '');
            } catch (error) {
                setError('Network error while fetching profile.');
            }
        };

        fetchProfile();
    }, []);

    const handleSalaryChange = (event) => {
        setSalary(event.target.value);
    };

    const handleUpdateProfile = async () => {
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch('http://127.0.0.1:5000/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader(), // Include the JWT header
                },
                body: JSON.stringify({ salary: parseFloat(salary) || null }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update profile.');
                return;
            }

            const data = await response.json();
            setSuccessMessage(data.message || 'Profile updated successfully!');
        } catch (error) {
            setError('Network error during profile update.');
        }
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('authToken'); // Remove the JWT on logout
        onLogout(); // Notify App.js about logout
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action is irreversible.')) {
            setError('');
            try {
                const response = await fetch('http://127.0.0.1:5000/delete_account', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeader(), // Include the JWT header
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    setError(errorData.error || 'Failed to delete account.');
                    return;
                }

                localStorage.removeItem('authToken');
                navigate('/login');
            } catch (error) {
                setError('Network error during account deletion.');
            }
        }
    };

    return (
        <div>
            <h2>Your Profile</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

            <div>
                <label>Username:</label>
                <p>{username}</p>
            </div>
            <div>
                <label>Email:</label>
                <p>{email}</p>
            </div>
            <div>
                <label htmlFor="salary">Salary (Optional):</label>
                <input
                    type="number"
                    id="salary"
                    value={salary}
                    onChange={handleSalaryChange}
                    placeholder="Enter your salary"
                />
            </div>
            <button onClick={handleUpdateProfile}>Update Profile</button>
            <button onClick={handleLogoutClick}>Logout</button>
            <button onClick={handleDeleteAccount} style={{ backgroundColor: 'red', color: 'white', marginLeft: '10px' }}>
                Delete Account
            </button>
        </div>
    );
}

export default Profile;