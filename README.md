# 信箱記錄本系統 (Mail Box Manager)

一個簡潔優雅的信箱管理系統,提供前台查看和後台管理功能。

## 功能特色

### 前台 (UI)
- 🔐 密碼保護
- 📧 信箱列表顯示
- 📋 一鍵複製信箱
- 🔍 搜尋功能
- 🔄 排序功能
- 🌓 深色/淺色主題

### 後台 (UX)
- ⚙️ 管理員登入
- ➕ 新增/編輯/刪除信箱
- 📝 備註管理(僅後台可見)
- 🔐 密碼設定
- 📊 統計資訊

## 目錄結構

```
mail_box/
├── ui/          # 前台(查看信箱列表)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── ux/          # 後台(管理信箱)
    ├── index.html
    ├── css/
    │   └── admin.css
    └── js/
        └── admin.js
```

## 預設密碼

- **前台密碼**: `csmcsm46`
- **後台密碼**: `csmcsm46`

## 部署

本專案為純靜態網站,可部署至:
- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

## 資料儲存

目前使用瀏覽器 localStorage 儲存資料。
