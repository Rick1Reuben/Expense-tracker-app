import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = 'http://127.0.0.1:5000/expenses'; // Replace if needed

function PieChartPage() {
    const [categoryData, setCategoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getAuthHeader = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(API_BASE_URL, { headers: getAuthHeader() }); // Include JWT header
            const expenses = response.data.expenses;
            processExpenseData(expenses);
        } catch (err) {
            setError(err.message || 'Failed to fetch expenses.');
        } finally {
            setLoading(false);
        }
    };

    const processExpenseData = (expenses) => {
        const categoryTotals = {};
        expenses.forEach((expense) => {
            const category = expense.category;
            const amount = expense.amount;
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const backgroundColors = generateColors(labels.length); // We'll define this function

        setCategoryData({
            labels: labels,
            datasets: [
                {
                    label: 'Expense Distribution',
                    data: data,
                    backgroundColor: backgroundColors,
                },
            ],
        });
    };

    // Simple color generator function
    const generateColors = (numColors) => {
        const colors = [];
        for (let i = 0; i < numColors; i++) {
            // You can use a more sophisticated color generation logic here
            colors.push(`hsl(${i * 360 / numColors}, 70%, 60%)`);
        }
        return colors;
    };

    if (loading) {
        return <div>Loading expense data for pie chart...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h2>Expense Distribution</h2>
            {categoryData && <Pie data={categoryData} />}
            {!categoryData && !loading && <p>No expense data available to display.</p>}
        </div>
    );
}

export default PieChartPage;