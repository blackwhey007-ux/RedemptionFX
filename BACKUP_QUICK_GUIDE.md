# 🛡️ RedemptionFX Backup Quick Reference Guide

## 🚀 **3 Ways to Backup Your Project**

### **Method 1: Double-Click Backup (EASIEST)**
1. Go to your project folder: `D:\recovery redemption\best 1\redemptionfx-platform1`
2. Double-click `backup-project.bat`
3. Wait for "BACKUP COMPLETED SUCCESSFULLY!"
4. Press any key to close

**✅ Result:** Backup saved as `redemptionfx-backup-YYYY-MM-DD-HHMMSS`

---

### **Method 2: Save Version with Description**
1. Go to your project folder
2. Double-click `save-version.bat`
3. Type a description (e.g., "Added login page")
4. Press Enter

**✅ Result:** Version saved in Git with your description

---

### **Method 3: PowerShell Commands**
1. Open PowerShell in project folder
2. Run: `.\backup-project.ps1`
3. Follow the prompts

**✅ Result:** Backup with progress bar and compression option

---

## 🔄 **How to Restore (If Something Goes Wrong)**

### **Restore from File Backup:**
1. Stop your project (close any servers)
2. Rename current folder to `redemptionfx-old`
3. Rename backup folder to `redemptionfx-platform1`
4. Run `npm install`
5. Start project with `start-project.bat`

### **Restore from Git Version:**
1. Open PowerShell in project folder
2. Run: `git log --oneline`
3. Copy the version code you want (first 7 characters)
4. Run: `git reset --hard <code>`
5. Run: `npm install`

---

## 📋 **Quick Commands Reference**

| What You Want | Command |
|---------------|---------|
| **Create backup** | Double-click `backup-project.bat` |
| **Save version** | Double-click `save-version.bat` |
| **See all versions** | `git log --oneline` |
| **Start project** | Double-click `start-project.bat` |
| **Restore version** | `git reset --hard <code>` |

---

## 💡 **When to Backup**

- ✅ **Before making ANY changes** to your project
- ✅ **After completing a feature** (use save-version.bat)
- ✅ **Weekly** (create a backup every week)
- ✅ **Before installing new packages** (npm install)
- ✅ **Before major updates**

---

## 🆘 **Emergency Recovery**

**If your project is completely broken:**

1. **Check your backups:**
   ```
   dir ..\redemptionfx-backup-*
   ```

2. **Restore the most recent backup:**
   - Rename current folder to `broken-project`
   - Rename latest backup to `redemptionfx-platform1`
   - Run `npm install`

3. **Or restore from Git:**
   ```
   git log --oneline
   git reset --hard <last-working-version>
   npm install
   ```

---

## 📞 **Need Help?**

- **Backup not working?** Check you're in the right folder
- **Git commands not working?** Make sure you're in PowerShell
- **Project won't start?** Run `npm install` first
- **Lost your backup?** Check the parent folder: `D:\recovery redemption\best 1\`

---

**🎯 Remember: Better to have too many backups than too few!**

**Last updated:** October 22, 2025

