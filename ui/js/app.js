// 全域變數與配置
// ===================================
let mailboxData = [];
let filteredData = [];
let currentView = 'grid';
let currentTheme = localStorage.getItem('theme') || 'light';
// 密碼快取 (預設值)
let frontendPassword = localStorage.getItem('frontend_password') || 'csmcsm46';

// Firebase 初始化
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firebase 初始化成功');
    // 初始化時立即載入設定
    loadSettings();
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
            if (data.frontendPassword) {
                frontendPassword = data.frontendPassword;
                // 更新本地快取
                localStorage.setItem('frontend_password', frontendPassword);
            }
        } else {
            // 如果設定不存在，建立預設設定
            await db.collection('settings').doc('config').set({
                frontendPassword: 'csmcsm46',
                adminPassword: 'csmcsm46'
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
    initTheme();
    initLogin();
    initEventListeners();

    // 檢查是否已登入
    if (isLoggedIn()) {
        hideLoginOverlay();
        loadMailboxData();
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

        // 登入前再次嘗試更新最新密碼
        await loadSettings();

        const password = passwordInput.value;

        if (password === frontendPassword) {
            // 登入成功
            setLoggedIn();
            hideLoginOverlay();
            loadMailboxData();
            showToast('登入成功!');
        } else {
            // 登入失敗
            loginError.textContent = '❌ 密碼錯誤,請重試';
            passwordInput.value = '';
            passwordInput.focus();

            // 3秒後清除錯誤訊息
            setTimeout(() => {
                loginError.textContent = '';
            }, 3000);
        }
    });
}

function hideLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.add('hidden');
}

function isLoggedIn() {
    return sessionStorage.getItem('mailbox_logged_in') === 'true';
}

function setLoggedIn() {
    sessionStorage.setItem('mailbox_logged_in', 'true');
}

// ===================================
// 主題切換
// ===================================
function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}

// ===================================
// 事件監聽器
// ===================================
function initEventListeners() {
    // 主題切換
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // 搜尋功能
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);

    // 清除搜尋
    document.getElementById('clearSearch').addEventListener('click', () => {
        searchInput.value = '';
        handleSearch();
    });

    // 排序
    document.getElementById('sortBy').addEventListener('change', handleSort);

    // 視圖切換
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // 模態框關閉
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // ESC 鍵關閉模態框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
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

        renderMailboxList();
        updateStats();
    } catch (error) {
        console.error('載入資料失敗:', error);
        showToast('載入資料失敗: ' + error.message, 'error');

        // 如果 Firebase 失敗,顯示空狀態
        mailboxData = [];
        filteredData = [];
        renderMailboxList();
        updateStats();
    }
}

// ===================================
// 渲染信箱列表
// ===================================
function renderMailboxList() {
    const container = document.getElementById('mailboxList');
    const emptyState = document.getElementById('emptyState');
    const noResults = document.getElementById('noResults');

    // 清空容器
    container.innerHTML = '';

    // 檢查是否有資料
    if (mailboxData.length === 0) {
        emptyState.style.display = 'block';
        noResults.style.display = 'none';
        return;
    }

    // 檢查篩選後是否有結果
    if (filteredData.length === 0) {
        emptyState.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    // 隱藏空狀態
    emptyState.style.display = 'none';
    noResults.style.display = 'none';

    // 渲染卡片
    filteredData.forEach(item => {
        const card = createMailboxCard(item);
        container.appendChild(card);
    });
}

// 建立信箱卡片 - 簡化版,只顯示信箱和時間
function createMailboxCard(data) {
    const card = document.createElement('div');
    card.className = 'mailbox-card fade-in';

    card.innerHTML = `
        <div class="card-title">
            <span>📧</span>
            <span style="word-break: break-all;">${data.email}</span>
        </div>
        <div class="card-meta">
            <span>📅 ${formatDateTime(data.createdDate)}</span>
        </div>
        <div class="card-actions">
            <button class="action-btn btn-copy-email" onclick="copyToClipboard('${data.email}', '信箱')" style="width: 100%;">
                📋 複製信箱
            </button>
        </div>
    `;

    return card;
}

// ===================================
// 搜尋功能
// ===================================
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearch');

    // 顯示/隱藏清除按鈕
    if (searchTerm) {
        clearBtn.classList.add('active');
    } else {
        clearBtn.classList.remove('active');
    }

    // 執行篩選
    applyFilters();
}

// ===================================
// 排序
// ===================================
function handleSort() {
    const sortBy = document.getElementById('sortBy').value;

    filteredData.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.createdDate) - new Date(a.createdDate);
            case 'date-asc':
                return new Date(a.createdDate) - new Date(b.createdDate);
            case 'email-asc':
                return a.email.localeCompare(b.email);
            case 'email-desc':
                return b.email.localeCompare(a.email);
            default:
                return 0;
        }
    });

    renderMailboxList();
}

// ===================================
// 應用所有篩選條件
// ===================================
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredData = mailboxData.filter(item => {
        // 只搜尋信箱
        return !searchTerm || item.email.toLowerCase().includes(searchTerm);
    });

    handleSort(); // 重新排序並渲染
}

// ===================================
// 視圖切換
// ===================================
function switchView(view) {
    currentView = view;
    const container = document.getElementById('mailboxList');

    // 更新按鈕狀態
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // 切換視圖樣式
    if (view === 'grid') {
        container.className = 'mailbox-grid';
    } else {
        container.className = 'mailbox-list';
    }
}

// ===================================
// 查看詳情 - 簡化版
// ===================================
function viewDetail(id) {
    const data = mailboxData.find(item => item.id === id);
    if (!data) return;

    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-title">信箱詳情</div>
            <div class="modal-subtitle">Mail Box Details</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">信箱地址</div>
            <div class="detail-value">
                <span style="word-break: break-all;">${data.email}</span>
                <span class="copy-icon" onclick="copyToClipboard('${data.email}', '信箱')">📋</span>
            </div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">登記時間</div>
            <div class="detail-value">
                <span>${formatDateTime(data.createdDate)}</span>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// 關閉模態框
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// ===================================
// 複製到剪貼簿
// ===================================
function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label}已複製到剪貼簿`);
    }).catch(err => {
        console.error('複製失敗:', err);
        showToast('複製失敗', 'error');
    });
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
// 更新統計資訊
// ===================================
function updateStats() {
    // 總信箱數
    document.getElementById('totalCount').textContent = mailboxData.length;
}

// ===================================
// 工具函數
// ===================================

// 格式化日期時間 (年/月/日 時:分:秒)
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

// ===================================
// 資料持久化 (未來實作)
// ===================================

// 從 Firebase 載入資料
async function loadFromFirebase() {
    // TODO: 實作 Firebase 連接
}

// 從 JSON 檔案載入資料
async function loadFromJSON() {
    // TODO: 實作 JSON 檔案讀取
}

// 匯出資料
function exportData() {
    const dataStr = JSON.stringify(mailboxData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mailbox_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
