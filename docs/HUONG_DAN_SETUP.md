# Hướng Dẫn Setup Academic Nexus

> Dành cho sinh viên nontech - Làm theo từng bước, không cần biết code
>
> **Thời gian dự kiến:** 30-45 phút
>
> **Khó khăn:** Dễ ⭐⭐☆☆☆

---

## 📋 Mục Lục

1. [Chuẩn Bị](#chuan-bi)
2. [Bước 1: Cài Node.js](#buoc-1-cai-nodejs)
3. [Bước 2: Cài Git](#buoc-2-cai-git)
4. [Bước 3: Tạo GitHub Account](#buoc-3-tao-github-account)
5. [Bước 4: Tạo Supabase Project](#buoc-4-tao-supabase-project)
6. [Bước 5: Chạy Database Migration](#buoc-5-chay-database-migration)
7. [Bước 6: Tạo Google Cloud Project](#buoc-6-tao-google-cloud-project)
8. [Bước 7: Cấu Hình Google OAuth](#buoc-7-cau-hinh-google-oauth)
9. [Bước 8: Download Code Về](#buoc-8-download-code-ve)
10. [Bước 9: Chạy Project Local](#buoc-9-chay-project-local)
11. [Bước 10: Deploy Lên Vercel](#buoc-10-deploy-len-vercel)
12. [Kiểm Tra & Troubleshooting](#kiem-tra-va-troubleshooting)

---

## 🎯 Chuẩn Bị

### Tài khoản cần tạo trước:

| Tài khoản | Link đăng ký | Thời gian |
|-----------|--------------|-----------|
| GitHub | https://github.com/signup | 3 phút |
| Supabase | https://supabase.com | 5 phút |
| Google Cloud | https://console.cloud.google.com | 5 phút |
| Vercel | https://vercel.com/signup | 2 phút |

### Công cụ cần cài:
- Node.js 18+ (15 phút)
- Git (10 phút)

---

## Bước 1: Cài Node.js

### Windows

**Bước 1.1:** Mở trình duyệt, truy cập:
```
https://nodejs.org
```

**Bước 1.2:** Click nút màu xanh "**Download Node.js (LTS)**"
- Ví dụ: `v20.11.0 LTS`
- File sẽ tải về: `node-v20.11.0-x64.msi`

**Bước 1.3:** Chạy file vừa tải
- Click Next → Next → Next
- Tick chọn "**Automatically install necessary toolsies**" nếu có
- Đợi cài đặt xong (2-3 phút)

**Bước 1.4:** Kiểm tra
1. Mở Command Prompt (gõ `cmd` trong Start Menu)
2. Gõ lệnh:
```bash
node --version
```
3. Phải hiện ra `v20.x.x` hoặc `v18.x.x`

---

### macOS

**Bước 1.1:** Mở trình duyệt, truy cập:
```
https://nodejs.org
```

**Bước 1.2:** Click "**Download Node.js (LTS)**"
- File tải về: `node-v20.11.0.pkg`

**Bước 1.3:** Chạy file `.pkg`
- Double-click file
- Continue → Continue → Install
- Nhập password máy nếu được yêu cầu

**Bước 1.4:** Kiểm tra
1. Mở Terminal (Cmd+Space, gõ `Terminal`)
2. Gõ:
```bash
node --version
```

---

## Bước 2: Cài Git

### Windows

**Bước 2.1:** Truy cập:
```
https://git-scm.com/download/win
```

**Bước 2.2:** Tải và chạy file cài đặt

**Bước 2.3:** Trong quá trình cài:
- Chọn "**Git from the command line and also from 3rd-party software**"
- Chọn "**Use bundled OpenSSH**"
- Chọn "**Use the native Windows Secure Channel Library**"
- Giữ nguyên các option khác → Install

**Bước 2.4:** Kiểm tra
```bash
git --version
```

---

### macOS

**Bước 2.1:** Mở Terminal

**Bước 2.2:** Gõ lệnh:
```bash
xcode-select --install
```

**Bước 2.3:** Click "**Install**" trong popup hiện ra

**Bước 2.4:** Đợi tải và cài xong (5-10 phút)

---

## Bước 3: Tạo GitHub Account

### 3.1 Đăng Ký

**Bước 3.1.1:** Truy cập:
```
https://github.com/signup
```

**Bước 3.1.2:** Điền form:
- Email: Dùng email thật (sẽ nhận mail xác nhận)
- Password: 8 ký tự trở lên, có chữ + số
- Username: Ví dụ `nguyenvana` (sẽ dùng sau)

**Bước 3.1.3:** Giải puzzle (nếu có)

**Bước 3.1.4:** Check email, click link xác nhận

---

### 3.2 Tạo Repository Chứa Code

**Bước 3.2.1:** Đăng nhập GitHub

**Bước 3.2.2:** Click dấu **+** góc phải → "**New repository**"

**Bước 3.2.3:** Điền:
- Repository name: `academic-nexus-app`
- Description: `He thong quan ly khoa luan tot nghiep`
- Public: ✅ Chọn
- Initialize with README: ✅ Tick chọn

**Bước 3.2.4:** Click "**Create repository**"

---

## Bước 4: Tạo Supabase Project

### 4.1 Đăng Ký Supabase

**Bước 4.1.1:** Truy cập:
```
https://supabase.com
```

**Bước 4.1.2:** Click "**Start your project**"

**Bước 4.1.3:** Chọn "**Continue with GitHub**" (dễ nhất)
- Authorize Supabase nếu được yêu cầu

---

### 4.2 Tạo Project Mới

**Bước 4.2.1:** Click "**New Project**"

**Bước 4.2.2:** Điền thông tin:

| Field | Nhập gì | Ví dụ |
|-------|---------|-------|
| Name | Tên project | `academic-nexus` |
| Database Password | Mật khẩu DB | `SinhVien2024!` |
| Region | Vùng gần nhất | **Singapore (ap-southeast-1)** |

**Bước 4.2.3:** Click "**Create new project**"

**Bước 4.2.4:** Đợi 2-3 phút
- Supabase sẽ tạo database
- Khi thấy "**Setup complete**" là xong

---

### 4.3 Lấy API Keys

**Bước 4.3.1:** Trong Supabase dashboard:
- Click icon **Settings** (bánh răng) góc trái
- Click "**API**"

**Bước 4.3.2:** Copy 2 giá trị:

```
Project URL:
https://abcdefgh.supabase.co

anon/public key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2...
```

> 💾 **Lưu:** Paste vào Notepad/Notes để dùng sau

---

## Bước 5: Chạy Database Migration

### Cách 1: Dùng SQL Editor (DỄ NHẤT - Khuyến nghị)

**Bước 5.1.1:** Trong Supabase:
- Click "**SQL Editor**" (thanh bên trái)
- Click "**+ New Query**"

**Bước 5.1.2:** Mở file SQL:
- Nếu có code trên máy: Mở file `supabase/migrations/001_initial_schema.sql`
- Copy toàn bộ nội dung (Ctrl+A → Ctrl+C)

**Bước 5.1.3:** Paste vào Supabase SQL Editor

**Bước 5.1.4:** Click "**Run**" (hoặc Ctrl+Enter)

**Bước 5.1.5:** Kiểm tra kết quả:
- ✅ Thành công: "Success. No rows returned"
- ❌ Lỗi: Đọc message lỗi, thường là syntax error

---

### Cách 2: Kiểm Tra Tables Đã Tạo

**Bước 5.2.1:** Click "**Table Editor**" (thanh trái)

**Bước 5.2.2:** Phải thấy các tables:
- ✅ `profiles`
- ✅ `proposals`
- ✅ `registrations`
- ✅ `submissions`
- ✅ `feedback`
- ✅ `appointments`
- ✅ `notifications`

---

### 5.3 Bật Google OAuth Trong Supabase

**Bước 5.3.1:** Click "**Authentication**" → "**Providers**"

**Bước 5.3.2:** Tìm "**Google**" → Click để mở

**Bước 5.3.3:** Bật "**Enable Sign in with Google**"

**Bước 5.3.4:** Điền credentials (làm ở Bước 6)

**Bước 5.3.5:** Click "**Save**"

---

## Bước 6: Tạo Google Cloud Project

### 6.1 Tạo Project

**Bước 6.1.1:** Truy cập:
```
https://console.cloud.google.com
```

**Bước 6.1.2:** Đăng nhập Google account

**Bước 6.1.3:** Click "**Select a Project**" → "**New Project**"

**Bước 6.1.4:** Điền:
- Project name: `Academic Nexus`
- Organization: **No organization**
- Location: **No organization**

**Bước 6.1.5:** Click "**Create**" → Đợi 30 giây

---

### 6.2 Bật Google+ API

**Bước 6.2.1:** Trong Google Cloud Console:
- Menu (3 gạch) → "**APIs & Services**" → "**Library**"

**Bước 6.2.2:** Search "**Google+ API**"

**Bước 6.2.3:** Click "**Enable**"

---

### 6.3 Tạo OAuth Consent Screen

**Bước 6.3.1:** Menu → "**APIs & Services**" → "**OAuth consent screen**"

**Bước 6.3.2:** Chọn "**External**" → Click "**Create**"

**Bước 6.3.3:** Điền form:

| Field | Nhập gì |
|-------|---------|
| App name | `Academic Nexus` |
| User support email | Email của bạn |
| App logo | (để trống) |
| App domain | (để trống) |
| Developer contact | Email của bạn |

**Bước 6.3.4:** Click "**Save and Continue**"

**Bước 6.3.5:** Scopes → **Save and Continue** (không thêm gì)

**Bước 6.3.6:** Test users → **Add users**
- Thêm email của bạn vào
- Click "**Save and Continue**"

---

### 6.4 Tạo OAuth Client ID

**Bước 6.4.1:** Menu → "**APIs & Services**" → "**Credentials**"

**Bước 6.4.2:** Click "**+ CREATE CREDENTIALS**" → "**OAuth client ID**"

**Bước 6.4.3:** Chọn "**Web application**"

**Bước 6.4.4:** Điền:
- Name: `Academic Nexus Web`

**Bước 6.4.5:** Thêm Authorized origins:
- Click "**+ ADD URI**"
- Nhập: `http://localhost:3000`
- Click "**+ ADD URI**" lần nữa
- Nhập: `https://your-app.vercel.app` (sẽ thay sau)

**Bước 6.4.6:** Thêm Authorized redirect URIs:
- Click "**+ ADD URI**"
- Nhập: `http://localhost:3000/auth/callback`
- Click "**+ ADD URI**" lần nữa
- Nhập: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`

> ⚠️ Thay `YOUR-PROJECT-ID` bằng project ID Supabase của bạn

**Bước 6.4.7:** Click "**Create**"

**Bước 6.4.8:** Popup hiện ra - Copy 2 giá trị:
```
Client ID: 123456789-abc123def456.apps.googleusercontent.com
Client Secret: GOCSPX-AbCdEf123456
```

> 💾 **Lưu:** Paste vào Notepad/Notes

---

## Bước 7: Hoàn Tất Google OAuth

### 7.1 Điền Credentials Vào Supabase

**Bước 7.1.1:** Quay lại Supabase

**Bước 7.1.2:** Authentication → Providers → Google

**Bước 7.1.3:** Paste:
- **Client ID**: Dán Client ID từ Google
- **Client Secret**: Dán Client Secret từ Google

**Bước 7.1.4:** Click "**Save**"

---

### 7.2 Thêm Redirect URL Vào Supabase

**Bước 7.2.1:** Authentication → URL Configuration

**Bước 7.2.2:** Thêm vào Redirect URLs:
```
http://localhost:3000/auth/callback
```

**Bước 7.2.3:** Site URL:
```
http://localhost:3000
```

**Bước 7.2.4:** Click "**Save**"

---

## Bước 8: Download Code Về

### 8.1 Clone Repository

**Bước 8.1.1:** Mở Terminal/Command Prompt

**Bước 8.1.2:** Đi đến Desktop:
```bash
cd Desktop
```

**Bước 8.1.3:** Clone code:
```bash
git clone https://github.com/USERNAME-cua-ban/academic-nexus-app.git
```

> Thay `USERNAME-cua-ban` bằng username GitHub của bạn

**Bước 8.1.4:** Vào thư mục:
```bash
cd academic-nexus-app
```

---

### 8.2 Cài Dependencies

**Bước 8.2.1:** Chạy lệnh:
```bash
npm install
```

**Bước 8.2.2:** Đợi 2-5 phút
- Sẽ thấy progress bar chạy
- Khi hiện `found X packages in Xm` là xong

---

### 8.3 Tạo File .env.local

**Bước 8.3.1:** Trong folder `academic-nexus-app`:
- Tìm file `.env.local.example`
- Copy thành `.env.local`

**Trên Terminal:**
```bash
cp .env.local.example .env.local
```

**Bước 8.3.2:** Mở file `.env.local` bằng Notepad/VS Code

**Bước 8.3.3:** Điền giá trị:

```env
# Supabase - Điền từ Bước 4.3
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Groq AI (nếu dùng AI features) - Optional
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

**Bước 8.3.4:** Lưu file (Ctrl+S)

---

## Bước 9: Chạy Project Local

### 9.1 Chạy Dev Server

**Bước 9.1.1:** Trong Terminal (ở folder `academic-nexus-app`):

```bash
npm run dev
```

**Bước 9.1.2:** Đợi khởi động
- Sẽ hiện: `Ready in 5s`
- `Local: http://localhost:3000`

**Bước 9.1.3:** Mở browser:
```
http://localhost:3000
```

---

### 9.2 Đăng Nhập Lần Đầu

**Bước 9.2.1:** Trang login hiện ra

**Bước 9.2.2:** Click "**Đăng nhập với Google Sinh viên**"

**Bước 9.2.3:** Chọn Google account

**Bước 9.2.4:** Nếu thành công → Redirect vào Dashboard

**Bước 9.2.5:** Nếu lỗi "User not found":
- Cần admin thêm bạn vào database
- Hoặc tự tạo bằng SQL (xem bên dưới)

---

### 9.3 Tự Tạo Admin User

**Bước 9.3.1:** Vào Supabase → Authentication → Users

**Bước 9.3.2:** Tìm user vừa đăng nhập → Copy **User ID**

**Bước 9.3.3:** SQL Editor → New Query

**Bước 9.3.4:** Chạy query:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'DÁN_USER_ID_VÀO_ĐÂY',
  'email-cua-ban@gmail.com',
  'Ten Cua Ban',
  'admin',
  true
);
```

> Thay USER_ID và email thật của bạn

**Bước 9.3.5:** Run → F5 lại trang → Đăng nhập lại

---

## Bước 10: Deploy Lên Vercel

### 10.1 Push Code Lên GitHub

**Bước 10.1.1:** Trong Terminal:

```bash
git add .
git commit -m "First commit"
git push origin main
```

**Bước 10.1.2:** Kiểm tra trên GitHub:
- Vào `github.com/USERNAME/academic-nexus-app`
- Phải thấy code đã lên

---

### 10.2 Tạo Vercel Account

**Bước 10.2.1:** Truy cập:
```
https://vercel.com/signup
```

**Bước 10.2.2:** Click "**Continue with GitHub**"

**Bước 10.2.3:** Authorize Vercel

---

### 10.3 Deploy Project

**Bước 10.3.1:** Click "**Add New Project**"

**Bước 10.3.2:** Click "**Import Git Repository**"

**Bước 10.3.3:** Chọn repository `academic-nexus-app`

**Bước 10.3.4:** Click "**Import**"

---

### 10.4 Cấu Hình Environment Variables

**Bước 10.4.1:** Trong form Deploy:
- Click "**Environment Variables**"

**Bước 10.4.2:** Add từng variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` |
| `GROQ_API_KEY` | `gsk_xxx` (nếu có) |

**Bước 10.4.3:** Click "**Save**" sau mỗi variable

---

### 10.5 Deploy

**Bước 10.5.1:** Click "**Deploy**"

**Bước 10.5.2:** Đợi 2-3 phút
- Progress bar chạy
- Khi hiện "**Congratulations**" là xong

**Bước 10.5.3:** Click "**Open in browser**"
- URL sẽ là: `https://academic-nexus-app-xxxx.vercel.app`

---

### 10.6 Cập Nhật Redirect URIs (QUAN TRỌNG)

**Sau khi deploy xong, PHẢI làm bước này:**

#### 10.6.1 Google Cloud Console

**Bước 10.6.1.1:** Vào Google Cloud → APIs & Services → Credentials

**Bước 10.6.1.2:** Edit OAuth Client ID

**Bước 10.6.1.3:** Thêm origin mới:
```
https://your-app-xxxx.vercel.app
```

**Bước 10.6.1.4:** Save

---

#### 10.6.2 Supabase

**Bước 10.6.2.1:** Authentication → URL Configuration

**Bước 10.6.2.2:** Thêm vào Redirect URLs:
```
https://your-app-xxxx.vercel.app/auth/callback
```

**Bước 10.6.2.3:** Cập nhật Site URL:
```
https://your-app-xxxx.vercel.app
```

**Bước 10.6.2.4:** Save

---

## 🎉 Hoàn Tất!

### Checklist đã xong:

- [ ] Node.js cài xong
- [ ] Git cài xong
- [ ] GitHub account tạo xong
- [ ] Supabase project tạo xong
- [ ] Database migration chạy xong
- [ ] Google OAuth config xong
- [ ] Code download về máy
- [ ] npm install thành công
- [ ] Chạy local: http://localhost:3000
- [ ] Deploy production: https://your-app.vercel.app

---

## 🧪 Kiểm Tra & Troubleshooting

### Test 1: Kiểm tra Node.js

```bash
node --version
npm --version
git --version
```

Phải hiện version, không được lỗi.

---

### Test 2: Kiểm tra Supabase Connection

Mở `.env.local`, kiểm tra:
- URL đúng format: `https://xxx.supabase.co`
- Key bắt đầu bằng: `eyJ...`

---

### Lỗi 1: "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Nguyên nhân:** File `.env.local` không có hoặc sai

**Cách sửa:**
```bash
# Kiểm tra file có tồn tại
ls .env.local

# Nếu không có, tạo lại
cp .env.local.example .env.local

# Edit file, điền đúng giá trị
```

Restart server: Ctrl+C → `npm run dev`

---

### Lỗi 2: "Failed to sign in with Google"

**Kiểm tra:**

1. Google Cloud Console:
   - Redirect URIs đúng chưa?
   - OAuth consent screen đã thêm test user chưa?

2. Supabase:
   - Google provider đã enable?
   - Client ID/Secret copy đúng?

3. Browser console (F12):
   - Xem lỗi chi tiết là gì

---

### Lỗi 3: "User not found"

**Nguyên nhân:** User chưa có trong table `profiles`

**Cách sửa:** Chạy SQL ở Bước 9.3

---

### Lỗi 4: npm install lỗi permissions

**Windows:**
- Chạy Command Prompt với quyền Admin (Right-click → Run as administrator)

**macOS/Linux:**
```bash
sudo npm install
```

---

### Lỗi 5: Git clone lỗi authentication

**Cách sửa:** Dùng HTTPS thay vì SSH

```bash
# Sai
git clone git@github.com:username/repo.git

# Đúng
git clone https://github.com/username/repo.git
```

---

## 📞 Cần Hỗ Trợ?

- 📧 Email: support@ute.edu.vn
- 💬 GitHub Issues: Tạo issue mới
- 📚 Supabase docs: https://supabase.com/docs
- 📚 Vercel docs: https://vercel.com/docs

---

*Lưu ý: Hướng dẫn này được cập nhật lần cuối ngày 2026-03-30. Nếu có thay đổi, check README.md để xem version mới nhất.*
