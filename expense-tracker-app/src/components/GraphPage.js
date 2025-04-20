import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const API_BASE_URL = 'http://127.0.0.1:5000';
const EXPENSES_URL = `${API_BASE_URL}/expenses`;
const PROFILE_URL = `${API_BASE_URL}/profile`;

function GraphPage() {
    const [expenseDataOverTime, setExpenseDataOverTime] = useState(null);
    const [depletionData, setDepletionData] = useState(null);
    const [initialAmount, setInitialAmount] = useState('');
    const [allExpenses, setAllExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [graphView, setGraphView] = useState('auto');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [aggregationInterval, setAggregationInterval] = useState('month');
    const [timeframeFilter, setTimeframeFilter] = useState('all');

    const getAuthHeader = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const expensesResponse = await axios.get(EXPENSES_URL, { headers: getAuthHeader() });
                setAllExpenses(expensesResponse.data.expenses);

                const profileResponse = await axios.get(PROFILE_URL, { headers: getAuthHeader() });
                setInitialAmount(profileResponse.data.salary || '');
            } catch (err) {
                setError(err.message || 'Failed to fetch data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!loading && !error && allExpenses) {
            processGraphData(allExpenses, graphView, aggregationInterval, startDate, endDate, parseFloat(initialAmount), timeframeFilter);
        }
    }, [allExpenses, graphView, aggregationInterval, startDate, endDate, initialAmount, loading, error, timeframeFilter]);

    const handleTimeframeFilterChange = (event) => {
        setTimeframeFilter(event.target.value);
    };

    const handleAggregationIntervalChange = (event) => {
        setAggregationInterval(event.target.value);
    };

    const handleGraphViewChange = (event) => {
        setGraphView(event.target.value);
    };

    const handleInitialAmountChange = (event) => {
        setInitialAmount(event.target.value);
    };

    const processGranularExpensesOverTime = (expenses) => {
        const sortedExpenses = expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedExpenses.map(expense => new Date(expense.date));
        let cumulativeAmount = 0;
        const data = sortedExpenses.map(expense => (cumulativeAmount += expense.amount));

        setExpenseDataOverTime({
            labels: labels,
            datasets: [{
                label: 'Cumulative Expenses',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
                pointRadius: 2,
                xAxisID: 'x-axis-time'
            }]
        });
    };

    const processGranularDepletionRate = (expenses, initial) => {
        const sortedExpenses = expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedExpenses.map(expense => new Date(expense.date));
        let remainingAmount = initial;
        const data = sortedExpenses.map(expense => (remainingAmount -= expense.amount));

        setDepletionData({
            labels: labels,
            datasets: [{
                label: 'Remaining Amount',
                data: data,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                pointRadius: 2,
                xAxisID: 'x-axis-time'
            }],
        });
    };

    const processExpensesOverTimeAggregated = (expenses, scale) => {
        const aggregatedData = {};
        expenses.forEach((expense) => {
            const date = new Date(expense.date);
            let key;
            switch (scale) {
                case 'day':
                    key = format(date, 'yyyy-MM-dd');
                    break;
                case 'week':
                    const startOfWeek = new Date(date);
                    startOfWeek.setDate(date.getDate() - date.getDay());
                    key = format(startOfWeek, 'yyyy-MM-dd');
                    break;
                case 'month':
                    key = format(date, 'yyyy-MM');
                    break;
                case 'year':
                    key = format(date, 'yyyy');
                    break;
                default:
                    key = format(date, 'yyyy-MM');
            }
            aggregatedData[key] = (aggregatedData[key] || 0) + expense.amount;
        });

        const sortedKeys = Object.keys(aggregatedData).sort();
        const labels = sortedKeys;
        const data = sortedKeys.map((key) => aggregatedData[key]);

        setExpenseDataOverTime({
            labels: labels,
            datasets: [{
                label: 'Total Expenses',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
            }],
        });
    };

    const processDepletionRateAggregated = (expenses, scale, initial) => {
        const aggregatedExpenses = {};
        expenses.forEach((expense) => {
            const date = new Date(expense.date);
            let key;
            switch (scale) {
                case 'day':
                    key = format(date, 'yyyy-MM-dd');
                    break;
                case 'week':
                    const startOfWeek = new Date(date);
                    startOfWeek.setDate(date.getDate() - date.getDay());
                    key = format(startOfWeek, 'yyyy-MM-dd');
                    break;
                case 'month':
                    key = format(date, 'yyyy-MM');
                    break;
                case 'year':
                    key = format(date, 'yyyy');
                    break;
                default:
                    key = format(date, 'yyyy-MM');
            }
            aggregatedExpenses[key] = (aggregatedExpenses[key] || 0) + expense.amount;
        });

        const sortedKeys = Object.keys(aggregatedExpenses).sort();
        const labels = sortedKeys;
        let remainingAmount = initial;
        const data = sortedKeys.map((key) => {
            remainingAmount -= (aggregatedExpenses[key] || 0);
            return remainingAmount >= 0 ? remainingAmount : 0;
        });

        setDepletionData({
            labels: labels,
            datasets: [{
                label: 'Remaining Amount',
                data: data,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
            }],
        });
    };

    const processGraphData = (expenses, view, scale, start, end, initial, timeframe) => {
        let filteredExpenses = [...expenses];

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (timeframe) {
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                filteredExpenses = filteredExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.toDateString() === yesterday.toDateString();
                });
                break;
            case 'lastWeek':
                const lastWeekStart = new Date(today);
                lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
                const lastWeekEnd = new Date(today);
                lastWeekEnd.setDate(today.getDate() - today.getDay());
                filteredExpenses = filteredExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= lastWeekStart && expenseDate < lastWeekEnd;
                });
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                filteredExpenses = filteredExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd;
                });
                break;
            case 'lastYear':
                const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
                const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                filteredExpenses = filteredExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= lastYearStart && expenseDate <= lastYearEnd;
                });
                break;
            default:
                break;
        }

        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const startDateFilter = start ? new Date(start).setHours(0, 0, 0, 0) <= expenseDate : true;
            const endDateFilter = end ? new Date(end).setHours(23, 59, 59, 999) >= expenseDate : true;
            return startDateFilter && endDateFilter;
        });

        if (view === 'granular') {
            processGranularExpensesOverTime(filteredExpenses);
            processGranularDepletionRate(filteredExpenses, initial);
        } else if (view === 'aggregated') {
            processExpensesOverTimeAggregated(filteredExpenses, scale);
            processDepletionRateAggregated(filteredExpenses, scale, initial);
        } else {
            const timeDifference = filteredExpenses.length > 1
                ? new Date(filteredExpenses[filteredExpenses.length - 1].date) - new Date(filteredExpenses[0].date)
                : 0;
            const numExpenses = filteredExpenses.length;
            const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000;

            if (timeDifference <= oneWeekInMillis || numExpenses <= 20) {
                processGranularExpensesOverTime(filteredExpenses);
                processGranularDepletionRate(filteredExpenses, initial);
            } else {
                processExpensesOverTimeAggregated(filteredExpenses, scale);
                processDepletionRateAggregated(filteredExpenses, scale);
            }
        }
    };

    return (
        <div className="graph-page-container">
            <h2>Expense Trends & Depletion</h2>

            <div className="graph-controls">
                <div>
                    <label htmlFor="graphView">View:</label>
                    <select id="graphView" value={graphView} onChange={handleGraphViewChange}>
                        <option value="auto">Auto</option>
                        <option value="granular">Granular</option>
                        <option value="aggregated">Aggregated</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="timeframeFilter">View By:</label>
                    <select id="timeframeFilter" value={timeframeFilter} onChange={handleTimeframeFilterChange}>
                        <option value="all">All Time</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="lastWeek">Last Week</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="lastYear">Last Year</option>
                    </select>
                </div>

                <div>
                    <label>Date Range:</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Start Date"
                    />
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="End Date"
                    />
                </div>

                <button onClick={() => processGraphData(allExpenses, graphView, aggregationInterval, startDate, endDate, parseFloat(initialAmount), timeframeFilter)}>Apply Filters</button>

                {graphView === 'aggregated' && (
                    <div>
                        <label htmlFor="aggregationInterval">Aggregate By:</label>
                        <select id="aggregationInterval" value={aggregationInterval} onChange={handleAggregationIntervalChange}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="graph-container">
                <h3>Expenses Over Time</h3>
                {expenseDataOverTime && (
                    <Line
                        data={expenseDataOverTime}
                        options={{
                            scales: {
                                x: {
                                    type: graphView === 'aggregated' ? 'category' : 'time',
                                    title: {
                                        display: true,
                                        text: graphView === 'aggregated' ? `Time (${aggregationInterval})` : 'Date'
                                    },
                                    labels: graphView === 'aggregated' ? expenseDataOverTime.labels : undefined,
                                    time: {
                                        unit: graphView === 'aggregated' ? undefined : 'day',
                                        displayFormats: {
                                            day: 'yyyy-MM-dd',
                                            hour: 'h:mm a',
                                            minute: 'h:mm a',
                                        },
                                    },
                                    ticks: {
                                        autoSkip: true,
                                        maxTicksLimit: 10,
                                        callback: graphView !== 'aggregated' ? function(value) {
                                            const dateValue = new Date(this.getLabelForValue(value));
                                            return isNaN(dateValue) ? '' : format(dateValue, 'yyyy-MM-dd');
                                        } : undefined
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Amount ($)'
                                    }
                                }
                            }
                        }}
                    />
                )}
                {!expenseDataOverTime && !loading && <p className="no-data-message">No expense data available to display.</p>}
            </div>

            <div className="graph-container">
                <h3>Depletion Rate (Optional)</h3>
                <div className="initial-amount-input">
                    <label htmlFor="initialAmount">Initial Amount:</label>
                    <input
                        type="number"
                        id="initialAmount"
                        value={initialAmount}
                        onChange={handleInitialAmountChange}
                        placeholder="Enter initial amount"
                    />
                </div>
                {depletionData && (
                    <Line
                        data={depletionData}
                        options={{
                            scales: {
                                x: {
                                    type: graphView === 'aggregated' ? 'category' : 'time',
                                    title: {
                                        display: true,
                                        text: graphView === 'aggregated' ? `Time (${aggregationInterval})` : 'Date'
                                    },
                                    labels: graphView === 'aggregated' ? depletionData.labels : undefined,
                                    time: {
                                        unit: graphView === 'aggregated' ? undefined : 'day',
                                        displayFormats: {
                                            day: 'yyyy-MM-dd',
                                            hour: 'h:mm a',
                                            minute: 'h:mm a',
                                        },
                                    },
                                    ticks: {
                                        autoSkip: true,
                                        maxTicksLimit: 10,
                                        callback: graphView !== 'aggregated' ? function(value) {
                                            const dateValue = new Date(this.getLabelForValue(value));
                                            return isNaN(dateValue) ? '' : format(dateValue, 'yyyy-MM-dd');
                                        } : undefined
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Remaining Amount ($)'
                                    }
                                }
                            }
                        }}
                    />
                )}
                {!depletionData && initialAmount !== '' && <p className="no-data-message">Depletion data will appear here.</p>}
            </div>

            {loading && <div className="loading-message">Loading graph data...</div>}
            {error && <p className="error-message">Error loading graph data: {error}</p>}
        </div>
    );
}

export default GraphPage;