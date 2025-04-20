import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE_URL = 'http://127.0.0.1:5000/expenses'; // Replace with your backend URL if different

function ExpensePage() {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [expenses, setExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOption, setSearchOption] = useState('description'); // Default search option
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [searchDate, setSearchDate] = useState(null); // State for selected date

    const getAuthHeader = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    useEffect(() => {
        const newFilteredExpenses = expenses.filter((expense) => {
            const searchTermLower = searchTerm.toLowerCase();
            const expenseDate = new Date(expense.date); // Convert expense date string to Date object
            const selectedDate = searchDate ? new Date(searchDate) : null; // Convert selected date to Date object

            switch (searchOption) {
                case 'description':
                    return expense.description.toLowerCase().includes(searchTermLower);
                case 'category':
                    return expense.category.toLowerCase().includes(searchTermLower);
                case 'amount':
                    return expense.amount.toString().includes(searchTerm);
                case 'date':
                    return selectedDate &&
                        expenseDate.getFullYear() === selectedDate.getFullYear() &&
                        expenseDate.getMonth() === selectedDate.getMonth() &&
                        expenseDate.getDate() === selectedDate.getDate();
                default:
                    return true;
            }
        });
        setFilteredExpenses(newFilteredExpenses);
    }, [searchTerm, searchOption, expenses, searchDate]);

    const fetchExpenses = async () => {
        try {
            const response = await axios.get(API_BASE_URL, { headers: getAuthHeader() });
            const sortedExpenses = response.data.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(sortedExpenses);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to fetch expenses.');
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!description || !amount || !category) {
            toast.error('Please fill in all fields.');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Amount must be a positive number.');
            setAmount('');
            return;
        }

        try {
            const response = await axios.post(API_BASE_URL, { description, amount: parsedAmount, category }, { headers: getAuthHeader() });
            const newExpense = response.data.expense;
            const updatedExpenses = [...expenses, newExpense].sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(updatedExpenses);
            setDescription('');
            setAmount('');
            setCategory('');
            toast.success('Expense added!');
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error('Failed to add expense.');
        }
    };

    const handleDeleteExpense = async (id) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
                const updatedExpenses = expenses.filter((expense) => expense.id !== id);
                setExpenses(updatedExpenses);
                toast.success('Expense deleted!');
            } catch (error) {
                console.error('Error deleting expense:', error);
                toast.error('Failed to delete expense.');
            }
        }
    };

    const handleResetSearch = () => {
        setSearchTerm('');
        setSearchOption('description');
        setSearchDate(null);
        setFilteredExpenses(expenses);
    };

    return (
        <div>
            <h2>Expense Management</h2>

            {/* Add Expense Form */}
            <form onSubmit={handleAddExpense}>
                <div>
                    <label htmlFor="description">Description:</label>
                    <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="amount">Amount:</label>
                    <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="category">Category:</label>
                    <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <button type="submit">Add Expense</button>
            </form>

            {/* Search Expenses */}
            <h3>Search Expenses</h3>
            <div>
                <label htmlFor="searchOption">Search By:</label>
                <select id="searchOption" value={searchOption} onChange={(e) => setSearchOption(e.target.value)}>
                    <option value="description">Description</option>
                    <option value="category">Category</option>
                    <option value="amount">Amount</option>
                    <option value="date">Date</option>
                </select>
                {searchOption === 'date' ? (
                    <DatePicker
                        selected={searchDate}
                        onChange={(date) => setSearchDate(date)}
                        dateFormat="yyyy-MM-dd"
                    />
                ) : (
                    <input
                        type="text"
                        placeholder={`Search by ${searchOption}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                )}
                <button onClick={handleResetSearch}>Reset</button>
            </div>

            {/* Display Expenses */}
            <h3>All Expenses</h3>
            {filteredExpenses.length === 0 ? (
                <p>No expenses match your search criteria.</p>
            ) : (
                <ul>
                    {filteredExpenses.map((expense) => (
                        <li key={expense.id}>
                            {expense.date.substring(0, 10)} - {expense.description} ({expense.category}): ${expense.amount}
                            <button onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ExpensePage;