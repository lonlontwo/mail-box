// ===================================
// 全域變數與配置
// ===================================
let mailboxData = [];
let filteredData = [];
let editingId = null;

// 從 localStorage 載入密碼,如果沒有則使用預設值
function getAdminPassword() {
    return localStorage.getItem('admin_password') || 'admin123';
}

function getFrontendPassword() {
    return localStorage.getItem('frontend_password') || '1234';
}

// ===================================
// 初始化
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initLogin();

    // 檢查是否已登入
    if (isLoggedIn()) {
        hideLoginOverlay();
        initAdmin();
    }
});

// ===================================
// 登入驗證
// ===================================
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const password = passwordInput.value;

        if (password === getAdminPassword()) {
            // 登入成功
            setLoggedIn();
            hideLoginOverlay();
            initAdmin();
            showToast('登入成功!');
        } else {
            // 登入失敗
            loginError.textContent = '❌ 密碼錯誤,請重試';
            passwordInput.value = '';
            passwordInput.focus();

            setTimeout(() => {
                loginError.textContent = '';
            }, 3000);
        }
    });
}

function hideLoginOverlay() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('mainContainer').style.display = 'block';
}

function isLoggedIn() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
}

function setLoggedIn() {
    sessionStorage.setItem('admin_logged_in', 'true');
}

function logout() {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
}

// ===================================
// 初始化管理介面
// ===================================
function initAdmin() {
    loadMailboxData();
    initEventListeners();
}

function initEventListeners() {
    // 登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 新增信箱按鈕
    document.getElementById('addMailboxBtn').addEventListener('click', openAddModal);

    // 密碼設定按鈕
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

    // 搜尋功能
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // 信箱模態框關閉
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // 設定模態框關閉
    document.getElementById('closeSettingsModal').addEventListener('click', closeSettingsModal);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettingsModal);

    // 表單提交
    document.getElementById('mailboxForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
}

// ===================================
// 載入信箱資料
// ===================================
function loadMailboxData() {
    // 從 localStorage 載入資料,如果沒有則使用示範資料
    const savedData = localStorage.getItem('mailbox_data');

    if (savedData) {
        mailboxData = JSON.parse(savedData);
    } else {
        mailboxData = getDemoData();
        saveData();
    }

    filteredData = [...mailboxData];
    renderTable();
    updateStats();
}

// 示範資料
function getDemoData() {
    return [
        {
            id: generateId(),
            email: 'work.account@gmail.com',
            createdDate: '2024-01-15T09:30:25',
            note: '公司主要信箱'
        },
        {
            id: generateId(),
            email: 'personal.life@outlook.com',
            createdDate: '2024-03-20T14:15:42',
            note: '個人生活使用'
        },
        {
            id: generateId(),
            email: 'shopping.deals@yahoo.com',
            createdDate: '2024-05-10T18:22:10',
            note: '專門用於網購'
        }
    ];
}

// 儲存資料到 localStorage
function saveData() {
    localStorage.setItem('mailbox_data', JSON.stringify(mailboxData));

    // 同步更新前端資料 (如果需要的話)
    // 這裡可以添加與前端的資料同步邏輯
}

// ===================================
// 渲染表格
// ===================================
function renderTable() {
    const tbody = document.getElementById('mailboxTableBody');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filteredData.forEach((item, index) => {
        const row = createTableRow(item, index + 1);
        tbody.appendChild(row);
    });
}

function createTableRow(data, index) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td>${index}</td>
        <td class="email-cell">${data.email}</td>
        <td>${formatDateTime(data.createdDate)}</td>
        <td class="note-cell">${data.note || ''}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-icon btn-edit" onclick="editMailbox('${data.id}')" title="編輯">
                    ✏️
                </button>
                <button class="btn-icon btn-delete" onclick="deleteMailbox('${data.id}')" title="刪除">
                    🗑️
                </button>
            </div>
        </td>
    `;

    return tr;
}

// ===================================
// 搜尋功能
// ===================================
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredData = mailboxData.filter(item => {
        return !searchTerm ||
            item.email.toLowerCase().includes(searchTerm) ||
            (item.note || '').toLowerCase().includes(searchTerm);
    });

    renderTable();
}

// ===================================
// 新增信箱
// ===================================
function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = '新增信箱';
    document.getElementById('submitBtnText').textContent = '新增';
    document.getElementById('emailInput').value = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('editId').value = '';

    openModal();
}

// ===================================
// 編輯信箱
// ===================================
function editMailbox(id) {
    const item = mailboxData.find(m => m.id === id);
    if (!item) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = '編輯信箱';
    document.getElementById('submitBtnText').textContent = '更新';
    document.getElementById('emailInput').value = item.email;
    document.getElementById('noteInput').value = item.note || '';
    document.getElementById('editId').value = id;

    openModal();
}

// ===================================
// 刪除信箱
// ===================================
function deleteMailbox(id) {
    const item = mailboxData.find(m => m.id === id);
    if (!item) return;

    if (confirm(`確定要刪除信箱「${item.email}」嗎?`)) {
        mailboxData = mailboxData.filter(m => m.id !== id);
        saveData();
        filteredData = [...mailboxData];
        renderTable();
        updateStats();
        showToast('信箱已刪除');
    }
}

// ===================================
// 表單提交
// ===================================
function handleFormSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('emailInput').value.trim();
    const note = document.getElementById('noteInput').value.trim();

    if (!email) {
        showToast('請輸入信箱地址', 'error');
        return;
    }

    if (editingId) {
        // 更新現有記錄
        const item = mailboxData.find(m => m.id === editingId);
        if (item) {
            item.email = email;
            item.note = note;
            showToast('信箱已更新');
        }
    } else {
        // 新增記錄
        const newItem = {
            id: generateId(),
            email: email,
            createdDate: getCurrentDateTime(),
            note: note
        };
        mailboxData.unshift(newItem); // 新增到最前面
        showToast('信箱已新增');
    }

    saveData();
    filteredData = [...mailboxData];
    renderTable();
    updateStats();
    closeModal();
}

// ===================================
// 模態框控制
// ===================================
function openModal() {
    document.getElementById('mailboxModal').classList.add('active');
    document.getElementById('emailInput').focus();
}

function closeModal() {
    document.getElementById('mailboxModal').classList.remove('active');
    editingId = null;
}

// ===================================
// 密碼設定
// ===================================
function openSettingsModal() {
    // 載入當前密碼
    document.getElementById('frontendPasswordInput').value = getFrontendPassword();
    document.getElementById('backendPasswordInput').value = getAdminPassword();

    document.getElementById('settingsModal').classList.add('active');
    document.getElementById('frontendPasswordInput').focus();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function handleSettingsSubmit(e) {
    e.preventDefault();

    const frontendPassword = document.getElementById('frontendPasswordInput').value.trim();
    const backendPassword = document.getElementById('backendPasswordInput').value.trim();

    if (!frontendPassword || !backendPassword) {
        showToast('請輸入完整的密碼', 'error');
        return;
    }

    // 儲存密碼到 localStorage
    localStorage.setItem('frontend_password', frontendPassword);
    localStorage.setItem('admin_password', backendPassword);

    closeSettingsModal();
    showToast('密碼設定已儲存!');
}

// ===================================
// 更新統計
// ===================================
function updateStats() {
    document.getElementById('totalCount').textContent = mailboxData.length;
}

// ===================================
// Toast 通知
// ===================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// ===================================
// 工具函數
// ===================================

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 獲取當前時間 (ISO 格式)
function getCurrentDateTime() {
    return new Date().toISOString();
}

// 格式化日期時間
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '未設定';
    const date = new Date(dateTimeString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
