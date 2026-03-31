# Google Apps Script Setup Guide

## Step 1: Create Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`

## Step 2: Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Create a **New Project**
3. Create these files and paste the contents:
   - `Code.gs` (replace default Code.gs)
   - `Auth.gs` (new file)
   - `BoardService.gs` (new file)
   - `TaskService.gs` (new file)
   - `SheetHelper.gs` (new file)

## Step 3: Configure

1. In `SheetHelper.gs`, replace `YOUR_SPREADSHEET_ID` with your actual Spreadsheet ID
2. Save all files

## Step 4: Initialize Database

1. In the Apps Script editor, select function `setupSpreadsheet`
2. Click **Run**
3. Grant required permissions when prompted
4. This will:
   - Create all 11 sheet tabs with headers
   - Create admin user: `admin` / `admin123`

## Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the **Web App URL**

## Step 6: Configure Frontend

1. In `sheetmaster-app/`, create `.env.local`:
```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

2. Start the app: `npm run dev`

## Step 7: Create Users

Run these functions from the Apps Script editor to create additional users:

```javascript
// createUser(username, password, name, role)
createUser("alice", "password123", "Alice Manager", "approver")
createUser("bob", "password123", "Bob Dev", "contributor")
createUser("carol", "password123", "Carol View", "viewer")
```

## Role Reference

| Role | Permissions |
|------|-------------|
| **owner** | Full control: manage members, delete board, all operations |
| **approver** | Can approve task movements, manage columns, edit all tasks |
| **contributor** | Create/edit own tasks, request approval for gated columns |
| **viewer** | View-only access, no editing |

## Important Notes

- Apps Script responses can take 1-3 seconds (Google's limitation)
- Board data auto-refreshes every 30 seconds
- Session tokens expire after 7 days
- Passwords are hashed using SHA-256 before storage
