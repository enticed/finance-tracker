import React from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    runTransaction, 
    collection, 
    onSnapshot,
    query,
    orderBy,
    Timestamp,
    setDoc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// Library Imports
import { ArrowUpCircle, ArrowDownCircle, DollarSign, CreditCard, Banknote, Calendar, Tag, PlusCircle, Landmark, Upload, BarChart2 } from 'lucide-react';

// --- Firebase Configuration ---
// This is your actual Firebase configuration object.
const firebaseConfig = {
  apiKey: "AIzaSyDL1lkVb4TSEhuRtj63lTFVDGJP5rRUWFo",
  authDomain: "expense-tracker-1d1c9.firebaseapp.com",
  projectId: "expense-tracker-1d1c9",
  storageBucket: "expense-tracker-1d1c9.appspot.com",
  messagingSenderId: "800926847850",
  appId: "1:800926847850:web:34ef91739c02fec212cb13",
  measurementId: "G-YRM6L2HDWE"
};

// Use the appId from your config for Firestore paths.
const appId = firebaseConfig.appId;

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [userId, setUserId] = React.useState(null);
    const [isAuthReady, setIsAuthReady] = React.useState(false);
    const [accounts, setAccounts] = React.useState([]);
    const [transactions, setTransactions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [transactionToEdit, setTransactionToEdit] = React.useState(null);
    const [isDarkMode, setIsDarkMode] = React.useState(false);

    // --- Firebase Initialization (inside the component) ---
    const app = React.useMemo(() => initializeApp(firebaseConfig), []);
    const auth = React.useMemo(() => getAuth(app), [app]);
    const db = React.useMemo(() => getFirestore(app), [app]);

    // --- Effects ---
    // Effect for Authentication
    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUserId(currentUser.uid);
            } else {
                try {
                    // For local development or environments without a token
                    await signInAnonymously(auth);
                } catch (err) {
                    console.error("Authentication Error:", err);
                    setError("Failed to authenticate. Please refresh the page.");
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, [auth]);

    // Effect for Data Fetching
    React.useEffect(() => {
        if (!isAuthReady || !userId) return;

        setIsLoading(true);

        // Listener for Accounts
        const accountsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/accounts`), orderBy('name'));
        const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
            const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAccounts(fetchedAccounts);
            setIsLoading(false);
        }, (err) => {
            console.error("Firestore Accounts Error:", err);
            setError("Failed to load account data.");
            setIsLoading(false);
        });

        // Listener for Transactions
        const transactionsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/transactions`), orderBy('date', 'desc'));
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate() // Convert Firestore Timestamp to JS Date
            }));
            setTransactions(fetchedTransactions);
        }, (err) => {
            console.error("Firestore Transactions Error:", err);
            setError("Failed to load transaction data.");
        });

        return () => {
            unsubscribeAccounts();
            unsubscribeTransactions();
        };
    }, [isAuthReady, userId, db]);

    // --- Event Handlers ---
    const handleAddAccount = async (account) => {
        if (!userId) {
            setError("You must be logged in to add an account.");
            return;
        }
        try {
            const accountsColRef = collection(db, `artifacts/${appId}/users/${userId}/accounts`);
            await addDoc(accountsColRef, account);
        } catch (err) {
             console.error("Add Account Error:", err);
             setError("Failed to add new account.");
        }
    };

    const handleAddTransaction = async (transaction) => {
        if (!userId) {
            throw new Error("You must be logged in to add a transaction.");
        }

        const { accountId, amount, type, date, description, category } = transaction;
        const numericAmount = parseFloat(amount);
        
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new Error("Transaction amount must be a positive number.");
        }

        const amountToUpdate = type === 'inflow' ? numericAmount : -numericAmount;
        const accountRef = doc(db, `artifacts/${appId}/users/${userId}/accounts`, accountId);
        const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);

        try {
            await runTransaction(db, async (t) => {
                const accountDoc = await t.get(accountRef);
                if (!accountDoc.exists()) {
                    throw new Error("Account does not exist!");
                }

                const newBalance = accountDoc.data().balance + amountToUpdate;
                t.update(accountRef, { balance: newBalance });
                
                const newTransactionRef = doc(transactionsColRef);
                t.set(newTransactionRef, {
                    description,
                    category,
                    amount: numericAmount,
                    type,
                    accountId,
                    date: Timestamp.fromDate(new Date(date))
                });
            });
        } catch (err) {
            console.error("Transaction Error:", err);
            setError(`Failed to add transaction: ${err.message}`);
            throw err; // Re-throw for the importer to catch
        }
    };

    const handleEditTransaction = async (updatedTransaction) => {
        if (!userId) {
            setError("You must be logged in to edit a transaction.");
            return;
        }
        try {
            const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, updatedTransaction.id);
            await updateDoc(transactionRef, {
                description: updatedTransaction.description,
                category: updatedTransaction.category,
                amount: parseFloat(updatedTransaction.amount),
                type: updatedTransaction.type,
                accountId: updatedTransaction.accountId,
                date: Timestamp.fromDate(new Date(updatedTransaction.date))
            });
            setEditModalOpen(false);
            setTransactionToEdit(null);
        } catch (err) {
            console.error("Edit Transaction Error:", err);
            setError("Failed to edit transaction.");
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!userId) {
            setError("You must be logged in to delete a transaction.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        try {
            const transactionRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId);
            await deleteDoc(transactionRef);
        } catch (err) {
            console.error("Delete Transaction Error:", err);
            setError("Failed to delete transaction.");
        }
    };

    // --- Render Logic ---
    if (!isAuthReady || isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${
            isDarkMode 
                ? 'bg-gradient-to-br from-dark-800 to-dark-900 text-dark-100' 
                : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'
        }`}>
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <Header userId={userId} />
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                            isDarkMode
                                ? 'bg-dark-600 text-dark-100 hover:bg-dark-500'
                                : 'bg-finance-600 text-white hover:bg-finance-700'
                        }`}
                    >
                        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                    </button>
                </div>
                {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
                <AccountSummaries accounts={accounts} isDarkMode={isDarkMode} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="lg:col-span-1 space-y-8">
                        <AddTransactionForm accounts={accounts} onAddTransaction={handleAddTransaction} isDarkMode={isDarkMode} />
                        <AddAccountForm onAddAccount={handleAddAccount} isDarkMode={isDarkMode} />
                        <CSVImporter accounts={accounts} onAddTransaction={handleAddTransaction} isDarkMode={isDarkMode} />
                    </div>
                    <div className="lg:col-span-2">
                        <TransactionList 
                            transactions={transactions} 
                            accounts={accounts} 
                            onEdit={t => { setTransactionToEdit(t); setEditModalOpen(true); }}
                            onDelete={handleDeleteTransaction}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>
                <div className="mt-8">
                    <ExpenseChart transactions={transactions} isDarkMode={isDarkMode} />
                </div>
                {editModalOpen && transactionToEdit && (
                    <EditTransactionModal 
                        transaction={transactionToEdit} 
                        accounts={accounts}
                        onClose={() => { setEditModalOpen(false); setTransactionToEdit(null); }}
                        onSave={handleEditTransaction}
                        isDarkMode={isDarkMode}
                    />
                )}
            </div>
        </div>
    );
}

// --- Sub-components ---

const Header = ({ userId }) => (
    <header className="mb-2">
        <h1 className="text-4xl font-bold text-finance-800 tracking-tight bg-gradient-to-r from-finance-600 to-finance-800 bg-clip-text text-transparent">Expense Tracker</h1>
        <p className="text-finance-600 mt-2">Welcome! Add accounts and track your transactions in one place.</p>
        {userId && <p className="text-xs text-finance-400 mt-2">User ID: {userId}</p>}
    </header>
);

const AccountSummaries = ({ accounts, isDarkMode }) => {
    if (accounts.length === 0) {
        return (
             <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500">
                <h2 className="text-xl font-semibold mb-2">Your Accounts</h2>
                <p>No accounts found. Add your first account below to get started!</p>
            </div>
        )
    }
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Your Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(account => (
                    <AccountCard key={account.id} account={account} isDarkMode={isDarkMode} />
                ))}
            </div>
        </div>
    );
};

const getIconForAccount = (type) => {
    switch(type) {
        case 'checking': return <Banknote className="w-8 h-8 text-success-500" />;
        case 'credit': return <CreditCard className="w-8 h-8 text-finance-500" />;
        case 'savings': return <Landmark className="w-8 h-8 text-finance-600" />;
        default: return <DollarSign className="w-8 h-8 text-dark-500" />;
    }
}

const AccountCard = ({ account, isDarkMode }) => {
    if (!account) return null;
    const balanceColor = account.balance >= 0 
        ? (isDarkMode ? 'text-success-400' : 'text-gray-800') 
        : 'text-danger-500';
    return (
        <div className={`${
            isDarkMode 
                ? 'bg-dark-800 backdrop-blur-sm border-gray-500' 
                : 'bg-white/50 backdrop-blur-sm border-white/20'
        } p-6 rounded-xl shadow-lg border transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4">
                        <div className={`${
                            isDarkMode 
                                ? 'bg-gradient-to-br from-dark-600 to-dark-500' 
                                : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                        } p-3 rounded-full shadow-sm`}>{getIconForAccount(account.type)}</div>
                        <h2 className={`text-xl font-semibold ${
                            isDarkMode ? 'text-dark-100' : 'text-gray-700'
                        }`}>{account.name}</h2>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-sm mb-1 ${
                        isDarkMode ? 'text-dark-400' : 'text-gray-500'
                    }`}>Balance</p>
                    <p className={`text-3xl font-bold ${balanceColor}`}>
                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        </div>
    );
};

const AddAccountForm = ({ onAddAccount, isDarkMode }) => {
    const [name, setName] = React.useState('');
    const [balance, setBalance] = React.useState('');
    const [type, setType] = React.useState('checking');
    const [formError, setFormError] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        if (!name.trim() || !balance.trim() || !type) {
            setFormError('All fields are required.');
            return;
        }
        onAddAccount({ name, balance: parseFloat(balance), type });
        setName('');
        setBalance('');
    };

    return (
         <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white/50'} backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20`}>
            <h3 className="text-xl font-semibold mb-4">Add New Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="accountName" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Account Name</label>
                    <input
                        type="text"
                        id="accountName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                        placeholder="e.g., My Checking"
                    />
                </div>
                <div>
                    <label htmlFor="initialBalance" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Initial Balance</label>
                     <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="number"
                            id="initialBalance"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            className={`pl-10 pr-3 form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>
                </div>
                 <div>
                    <label htmlFor="accountType" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Account Type</label>
                    <select
                        id="accountType"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={`form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                    >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="credit">Credit Card</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <button
                    type="submit"
                    className={`btn-primary ${isDarkMode ? 'btn-primary-dark' : 'btn-primary-light'}`}
                >
                    <PlusCircle className="w-5 h-5" /> Add Account
                </button>
            </form>
        </div>
    );
};

const CSVImporter = ({ accounts, onAddTransaction, isDarkMode }) => {
    const [file, setFile] = React.useState(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const [importError, setImportError] = React.useState('');
    const [importSuccess, setImportSuccess] = React.useState('');

    const handleFileChange = (event) => {
        setImportError('');
        setImportSuccess('');
        if (event.target.files.length) {
            setFile(event.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file) {
            setImportError('Please select a file to import.');
            return;
        }

        setIsImporting(true);
        setImportError('');
        setImportSuccess('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const requiredHeaders = ['Account', 'Date', 'Source', 'Amount', 'Category'];
                const actualHeaders = results.meta.fields;
                const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    setImportError(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                    setIsImporting(false);
                    return;
                }

                let successCount = 0;
                let errorCount = 0;
                let errors = [];

                for (const [index, row] of results.data.entries()) {
                    const accountName = row.Account?.trim();
                    const account = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase());

                    if (!account) {
                        errors.push(`Row ${index + 2}: Account "${accountName}" not found. Please create it first.`);
                        errorCount++;
                        continue;
                    }

                    const date = row.Date;
                    const source = row.Source;
                    const amount = parseFloat(row.Amount);
                    const category = row.Category;

                    if (!accountName || !date || !source || isNaN(amount) || !category) {
                        errors.push(`Row ${index + 2}: Missing or invalid data.`);
                        errorCount++;
                        continue;
                    }
                    if (amount === 0) {
                        errors.push(`Row ${index + 2}: Amount cannot be zero.`);
                        errorCount++;
                        continue;
                    }
                    
                    const transaction = {
                        accountId: account.id,
                        date: date,
                        description: source,
                        amount: Math.abs(amount),
                        category: category,
                        type: amount > 0 ? 'inflow' : 'outflow',
                    };

                    try {
                        await onAddTransaction(transaction);
                        successCount++;
                    } catch (e) {
                        errors.push(`Row ${index + 2}: ${e.message}`);
                        errorCount++;
                    }
                }

                setImportSuccess(`Import complete! ${successCount} transactions imported.`);
                if (errorCount > 0) {
                    const errorSummary = errors.slice(0, 3).join(' ');
                    setImportError(`${errorCount} rows failed to import. ${errorSummary}`);
                }
                setIsImporting(false);
                if (document.getElementById('csvFile')) {
                    document.getElementById('csvFile').value = '';
                }
                setFile(null);
            },
            error: (error) => {
                setImportError(`CSV parsing failed: ${error.message}`);
                setIsImporting(false);
            }
        });
    };

    return (
        <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white/50'} backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20`}>
            <h3 className="text-xl font-semibold mb-1">Import from CSV</h3>
            <div className="space-y-4">
                <div>
                    <p className="text-xs text-gray-500 mb-2">Headers: Account, Date, Source, Amount, Category</p>
                    <input
                        type="file"
                        id="csvFile"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDarkMode ? 'file:bg-gray-500 file:text-gray-200 hover:file:bg-gray-600' : 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100'}`}
                    />
                </div>
                {importSuccess && <p className="text-sm text-green-600">{importSuccess}</p>}
                {importError && <p className="text-sm text-red-600">{importError}</p>}
                <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || !file}
                    className={`btn-primary ${isDarkMode ? 'btn-primary-dark' : 'btn-primary-light'} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                    <Upload className="w-5 h-5" />
                    {isImporting ? 'Importing...' : 'Import Transactions'}
                </button>
            </div>
        </div>
    );
};

const AddTransactionForm = ({ accounts, onAddTransaction, isDarkMode }) => {
    const [description, setDescription] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [accountId, setAccountId] = React.useState('');
    const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
    const [formError, setFormError] = React.useState('');

    React.useEffect(() => {
        if (accounts.length > 0 && !accountId) {
             setAccountId(accounts[0].id);
        }
    }, [accounts, accountId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!description || !amount || !accountId || !date || !category) {
            setFormError('All fields are required.');
            return;
        }
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount === 0) {
            setFormError('Amount must be a non-zero number.');
            return;
        }

        const transactionType = numericAmount > 0 ? 'inflow' : 'outflow';
        const absoluteAmount = Math.abs(numericAmount);

        try {
            await onAddTransaction({ description, category, amount: absoluteAmount, type: transactionType, accountId, date });
            setDescription('');
            setAmount('');
            setCategory('');
        } catch(e) {
            setFormError(e.message);
        }
    };

    return (
        <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white/50'} backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20`}>
            <h3 className="text-xl font-semibold mb-4">Add New Transaction</h3>
            {accounts.length === 0 ? (
                <p className="text-center text-gray-500">Please add an account before adding transactions.</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="description" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Merchant / Source</label>
                        <input
                            type="text"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                            placeholder="e.g., Amazon, Salary"
                        />
                    </div>
                    <div>
                        <label htmlFor="category" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Category</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                                <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className={`pl-10 pr-3 form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                                placeholder="e.g., Groceries, Utilities"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="amount" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Amount (negative for expense)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={`pl-10 pr-3 form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                                placeholder="e.g., -50.00 for expense"
                                step="0.01"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="date" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Date</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={`pl-10 pr-3 form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="account" className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Account</label>
                        <select
                            id="account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className={`form-input ${isDarkMode ? 'form-input-dark' : 'form-input-light'}`}
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    <button
                        type="submit"
                        className={`btn-primary ${isDarkMode ? 'btn-primary-dark' : 'btn-primary-light'}`}
                    >
                        Add Transaction
                    </button>
                </form>
            )}
        </div>
    );
};

const TransactionList = ({ transactions, accounts, onEdit, onDelete, isDarkMode }) => {
    const getAccountName = (id) => accounts.find(a => a.id === id)?.name || 'Unknown Account';

    if (transactions.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <h3 className="text-xl font-semibold mb-2">Recent Transactions</h3>
                <p className="text-gray-500">No transactions yet. Add one to get started!</p>
            </div>
        );
    }

    return (
        <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white/30'} backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20`}>
            <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3" style={{ maxHeight: '1100px', overflowY: 'auto' }}>
                {transactions.map(t => (
                    <div key={t.id} className={`flex items-center justify-between p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                        <div className="flex items-center gap-4">
                            {t.type === 'inflow'
                                ? <ArrowUpCircle className="w-6 h-6 text-green-500" />
                                : <ArrowDownCircle className="w-6 h-6 text-red-500" />
                            }
                            <div>
                                <p className={`font-normal ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t.description}</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    <span className={`font-medium ${isDarkMode ? 'bg-gray-400' : 'bg-gray-200'} text-gray-600 px-2 pb-px rounded-full`}>{t.category}</span> 
                                    <span className="mx-1">&bull;</span>
                                    {getAccountName(t.accountId)} 
                                    <span className="mx-1">&bull;</span>
                                    {t.date?.toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className={`font-semibold ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'inflow' ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <button
                                className={`ml-2 btn-secondary ${isDarkMode ? 'btn-edit-dark' : 'btn-edit'}`}
                                onClick={() => onEdit(t)}
                                title="Edit"
                            >Edit</button>
                            <button
                                className={`ml-1 btn-secondary ${isDarkMode ? 'btn-delete-dark' : 'btn-delete'}`}
                                onClick={() => onDelete(t.id)}
                                title="Delete"
                            >Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExpenseChart = ({ transactions, isDarkMode }) => {
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

    const availableYears = React.useMemo(() => {
        const years = new Set(transactions.map(t => t.date.getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const chartData = React.useMemo(() => {
        const expenseTransactions = transactions.filter(t => 
            t.type === 'outflow' && t.date.getFullYear() === selectedYear
        );

        if (expenseTransactions.length === 0) return { data: [], categories: [] };
        
        const categories = [...new Set(expenseTransactions.map(t => t.category))];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const data = monthNames.map(monthName => ({ name: monthName }));

        expenseTransactions.forEach(t => {
            const monthIndex = t.date.getMonth();
            const category = t.category;
            if (!data[monthIndex][category]) {
                data[monthIndex][category] = 0;
            }
            data[monthIndex][category] += t.amount;
        });

        return { data, categories };

    }, [transactions, selectedYear]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white/50'} p-6 rounded-xl shadow-md`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-indigo-600" />
                    Monthly Expense Breakdown
                </h3>
                {availableYears.length > 0 && (
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                        className={`block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${isDarkMode ? 'bg-dark-600' : 'bg-white'}`}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                )}
            </div>
            {chartData.data?.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                        <Tooltip formatter={(value, name) => [value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), name]} />
                        <Legend />
                        {chartData.categories.map((category, index) => (
                            <Bar key={category} dataKey={category} stackId="a" fill={colors[index % colors.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="text-center text-gray-500 py-16">
                    <p>No expense data available for {selectedYear}.</p>
                    <p className="text-sm">Add some expense transactions to see the chart.</p>
                </div>
            )}
        </div>
    );
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const ErrorMessage = ({ message, onClose }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-md flex justify-between items-center">
        <p>{message}</p>
        <button onClick={onClose} className="text-red-500 hover:text-red-700">&times;</button>
    </div>
);

const EditTransactionModal = ({ transaction, accounts, onClose, onSave, isDarkMode }) => {
    const [description, setDescription] = React.useState(transaction.description);
    const [category, setCategory] = React.useState(transaction.category);
    const [amount, setAmount] = React.useState(transaction.amount);
    const [accountId, setAccountId] = React.useState(transaction.accountId);
    const [date, setDate] = React.useState(transaction.date ? new Date(transaction.date).toISOString().slice(0, 10) : '');
    const [type, setType] = React.useState(transaction.type);
    const [formError, setFormError] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        if (!description || !amount || !accountId || !date || !category) {
            setFormError('All fields are required.');
            return;
        }
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount === 0) {
            setFormError('Amount must be a non-zero number.');
            return;
        }
        onSave({
            ...transaction,
            description,
            category,
            amount: Math.abs(numericAmount),
            type,
            accountId,
            date
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className={`${isDarkMode ? 'bg-dark-800' : 'bg-white'} p-6 rounded-xl shadow-lg w-full max-w-md relative`}>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                <h3 className="text-xl font-semibold mb-4">Edit Transaction</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                        />
                    </div>
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                        />
                    </div>
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                        >
                            <option value="inflow">Inflow</option>
                            <option value="outflow">Outflow</option>
                        </select>
                    </div>
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                        />
                    </div>
                    <div>
                        <label className={`form-label ${isDarkMode ? 'form-label-dark' : 'form-label-light'}`}>Account</label>
                        <select
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
                            className={`modal-input ${isDarkMode ? 'modal-input-dark' : 'modal-input-light'}`}
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    <button
                        type="submit"
                        className={`btn-primary ${isDarkMode ? 'btn-primary-dark' : 'btn-primary-light'}`}
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};
