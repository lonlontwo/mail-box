// 全域變數與配置
// ===================================
let mailboxData = [];
let filteredData = [];
let editingId = null;

// 密碼快取
let adminPassword = localStorage.getItem('admin_password') || 'admin123';
let frontendPassword = localStorage.getItem('frontend_password') || '1234';

// Firebase 初始化
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firebase 初始化成功 - v20260105_ForceUpdate');
    loadSettings(); // 初始化時載入設定
} catch (error) {
    console.error('Firebase 初始化失敗:', error);
}

// 從 Firebase 載入密碼設定
async function loadSettings() {
    try {
        if (!db) return;
        const doc = await db.collection('settings').doc('config').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.adminPassword) {
                adminPassword = data.adminPassword;
                localStorage.setItem('admin_password', adminPassword);
            }
            if (data.frontendPassword) {
                frontendPassword = data.frontendPassword;
                localStorage.setItem('frontend_password', frontendPassword);
            }
        } else {
            // 如果不存在，使用預設值初始化
            await db.collection('settings').doc('config').set({
                frontendPassword: frontendPassword,
                adminPassword: adminPassword
            });
        }
    } catch (error) {
        console.error('載入設定失敗:', error);
    }
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 登入前確保密碼是最新的
        await loadSettings();

        const password = passwordInput.value;

        if (password === adminPassword) {
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
// 載入信箱資料 - 從 Firebase Firestore
// ===================================
async function loadMailboxData() {
    try {
        if (!db) {
            throw new Error('Firebase 未初始化');
        }

        // 從 Firestore 載入資料
        const snapshot = await db.collection('mailboxes').orderBy('createdDate', 'desc').get();

        mailboxData = [];
        snapshot.forEach(doc => {
            mailboxData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`從 Firebase 載入了 ${mailboxData.length} 筆信箱資料`);

        filteredData = [...mailboxData];
        renderTable();
        updateStats();
    } catch (error) {
        console.error('載入資料失敗:', error);
        showToast('載入資料失敗: ' + error.message, 'error');

        // 如果 Firebase 失敗,顯示空狀態
        mailboxData = [];
        filteredData = [];
        renderTable();
        updateStats();
    }
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
// 刪除信箱 - 從 Firebase
// ===================================
async function deleteMailbox(id) {
    const item = mailboxData.find(m => m.id === id);
    if (!item) return;

    if (confirm(`確定要刪除信箱「${item.email}」嗎?`)) {
        try {
            // 從 Firestore 刪除
            await db.collection('mailboxes').doc(id).delete();

            // 更新本地資料
            mailboxData = mailboxData.filter(m => m.id !== id);
            filteredData = [...mailboxData];
            renderTable();
            updateStats();
            showToast('信箱已刪除');
        } catch (error) {
            console.error('刪除失敗:', error);
            showToast('刪除失敗: ' + error.message, 'error');
        }
    }
}

// ===================================
// 表單提交 - 儲存到 Firebase
// ===================================
async function handleFormSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('emailInput').value.trim();
    const note = document.getElementById('noteInput').value.trim();

    if (!email) {
        showToast('請輸入信箱地址', 'error');
        return;
    }

    try {
        if (editingId) {
            // 更新現有記錄到 Firestore
            await db.collection('mailboxes').doc(editingId).update({
                email: email,
                note: note
            });

            // 更新本地資料
            const item = mailboxData.find(m => m.id === editingId);
            if (item) {
                item.email = email;
                item.note = note;
            }
            showToast('信箱已更新');
        } else {
            // 新增記錄到 Firestore
            const newItem = {
                email: email,
                createdDate: getCurrentDateTime(),
                note: note
            };

            const docRef = await db.collection('mailboxes').add(newItem);

            // 更新本地資料
            mailboxData.unshift({
                id: docRef.id,
                ...newItem
            });
            showToast('信箱已新增');
        }

        filteredData = [...mailboxData];
        renderTable();
        updateStats();
        closeModal();
    } catch (error) {
        console.error('儲存失敗:', error);
        showToast('儲存失敗: ' + error.message, 'error');
    }
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
    document.getElementById('frontendPasswordInput').value = frontendPassword;
    document.getElementById('backendPasswordInput').value = adminPassword;

    document.getElementById('settingsModal').classList.add('active');
    document.getElementById('frontendPasswordInput').focus();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

async function handleSettingsSubmit(e) {
    e.preventDefault();

    const newFrontendPassword = document.getElementById('frontendPasswordInput').value.trim();
    const newBackendPassword = document.getElementById('backendPasswordInput').value.trim();

    if (!newFrontendPassword || !newBackendPassword) {
        showToast('請輸入完整的密碼', 'error');
        return;
    }

    try {
        // 儲存密碼到 Firebase
        await db.collection('settings').doc('config').set({
            frontendPassword: newFrontendPassword,
            adminPassword: newBackendPassword
        }, { merge: true });

        // 更新本地快取
        frontendPassword = newFrontendPassword;
        adminPassword = newBackendPassword;
        localStorage.setItem('frontend_password', frontendPassword);
        localStorage.setItem('admin_password', adminPassword);

        closeSettingsModal();
        showToast('密碼設定已儲存 (同步至雲端)!');
    } catch (error) {
        console.error('儲存密碼失敗:', error);
        showToast('儲存密碼失敗: ' + error.message, 'error');
    }
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
