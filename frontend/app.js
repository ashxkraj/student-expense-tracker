// API Configuration
const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : '/api';

let currentUser = null;
let currentExpense = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Auth Functions
function switchAuthTab(tab) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  document.getElementById(tab + 'Tab').classList.add('active');
  document.getElementById(tab + 'Form').classList.add('active');
  
  // Clear error messages
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error((await response.json()).error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    showScreen('dashboardScreen');
    loadDashboard();
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const errorDiv = document.getElementById('registerError');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      throw new Error((await response.json()).error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    showScreen('dashboardScreen');
    loadDashboard();
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  currentUser = null;
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('registerUsername').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  showScreen('authScreen');
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    showScreen('dashboardScreen');
    loadDashboard();
  } else {
    showScreen('authScreen');
  }
}

// Screen Management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Dashboard Functions
async function loadDashboard() {
  await loadProfile();
  await loadDashboardStats();
  await loadExpenses();
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) throw new Error('Failed to load profile');

    const user = await response.json();
    currentUser = user;
    document.getElementById('userDisplay').textContent = `Welcome, ${user.username}`;
  } catch (err) {
    console.error(err);
  }
}

async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) throw new Error('Failed to load dashboard');

    const data = await response.json();

    // Update stat cards
    document.getElementById('budgetAmount').textContent = `$${data.monthlyBudget.toFixed(2)}`;
    document.getElementById('totalSpent').textContent = `$${data.totalSpent.toFixed(2)}`;
    document.getElementById('remainingBalance').textContent = `$${data.remainingBalance.toFixed(2)}`;
    document.getElementById('averageExpense').textContent = `$${data.averageExpense.toFixed(2)}`;

    // Update category breakdown
    updateCategoryBreakdown(data.spendByCategory);
  } catch (err) {
    console.error(err);
  }
}

function updateCategoryBreakdown(categories) {
  const categoryList = document.getElementById('categoryList');
  categoryList.innerHTML = '';

  if (Object.keys(categories).length === 0) {
    categoryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #9ca3af;">No expenses yet</p>';
    return;
  }

  Object.entries(categories).forEach(([category, amount]) => {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `
      <div class="category-name">${category}</div>
      <div class="category-amount">$${amount.toFixed(2)}</div>
    `;
    categoryList.appendChild(item);
  });
}

async function loadExpenses() {
  try {
    const category = document.getElementById('categoryFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let url = `${API_BASE_URL}/expenses`;
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) throw new Error('Failed to load expenses');

    const expenses = await response.json();
    displayExpenses(expenses);
  } catch (err) {
    console.error(err);
  }
}

function displayExpenses(expenses) {
  const list = document.getElementById('expensesList');
  list.innerHTML = '';

  if (expenses.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No expenses found</p>
        <button class="btn btn-primary" onclick="openExpenseModal()">Add Your First Expense</button>
      </div>
    `;
    return;
  }

  expenses.forEach(expense => {
    const date = new Date(expense.date).toLocaleDateString();
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.innerHTML = `
      <div class="expense-info">
        <div class="expense-title">${escapeHtml(expense.title)}</div>
        <div class="expense-meta">
          <span>${date}</span>
          <span class="expense-category">${expense.category}</span>
          ${expense.notes ? `<span>${escapeHtml(expense.notes)}</span>` : ''}
        </div>
      </div>
      <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
      <div class="expense-actions">
        <button class="btn-icon btn-edit" onclick="editExpense('${expense._id}')">Edit</button>
        <button class="btn-icon btn-delete" onclick="deleteExpense('${expense._id}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// Expense Modal Functions
function openExpenseModal() {
  currentExpense = null;
  document.getElementById('modalTitle').textContent = 'Add Expense';
  document.getElementById('expenseForm').reset();
  document.getElementById('expenseDate').valueAsDate = new Date();
  document.getElementById('expenseError').textContent = '';
  document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.remove('active');
}

async function editExpense(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) throw new Error('Failed to load expense');

    const expense = await response.json();
    currentExpense = expense;

    document.getElementById('modalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseTitle').value = expense.title;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseDate').valueAsDate = new Date(expense.date);
    document.getElementById('expenseNotes').value = expense.notes || '';
    document.getElementById('expenseError').textContent = '';
    document.getElementById('expenseModal').classList.add('active');
  } catch (err) {
    alert('Failed to load expense: ' + err.message);
  }
}

async function handleExpenseSubmit(event) {
  event.preventDefault();
  const errorDiv = document.getElementById('expenseError');

  const expenseData = {
    title: document.getElementById('expenseTitle').value,
    amount: parseFloat(document.getElementById('expenseAmount').value),
    category: document.getElementById('expenseCategory').value,
    date: document.getElementById('expenseDate').value,
    notes: document.getElementById('expenseNotes').value,
  };

  try {
    let url = `${API_BASE_URL}/expenses`;
    let method = 'POST';

    if (currentExpense) {
      url += `/${currentExpense._id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(expenseData),
    });

    if (!response.ok) {
      throw new Error((await response.json()).error || 'Failed to save expense');
    }

    closeExpenseModal();
    await loadExpenses();
    await loadDashboardStats();
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) throw new Error('Failed to delete expense');

    await loadExpenses();
    await loadDashboardStats();
  } catch (err) {
    alert('Failed to delete expense: ' + err.message);
  }
}

// Budget Modal Functions
function openBudgetModal() {
  document.getElementById('budgetInput').value = currentUser.monthlyBudget || 1000;
  document.getElementById('budgetError').textContent = '';
  document.getElementById('budgetModal').classList.add('active');
}

function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('active');
}

async function handleBudgetSubmit(event) {
  event.preventDefault();
  const errorDiv = document.getElementById('budgetError');
  const monthlyBudget = parseFloat(document.getElementById('budgetInput').value);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/budget`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ monthlyBudget }),
    });

    if (!response.ok) throw new Error('Failed to update budget');

    closeBudgetModal();
    await loadDashboardStats();
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Filter Functions
function clearFilters() {
  document.getElementById('categoryFilter').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  loadExpenses();
}

// Utility Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
