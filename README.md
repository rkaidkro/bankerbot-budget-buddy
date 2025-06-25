# 🧼💰 BadBoyBubby's Banking – A Budget Dashboard That Slaps

*Because budgeting should feel like licking the floor of a Centrelink while calculating your net position.*

---

## 🐀 What Is This?

**BadBoyBubby’s Banking** is a **100% in-browser budget dashboard** that lets you:

- 🧾 Upload multiple CSV, XLS (and maybe even PDF) bank exports  
- 🧠 Magically merge them into one sexy transaction table  
- 🔍 Sort, filter, and analyse without ever leaving your browser  
- 📤 Export your net financial shame back to `.xlsx`  
- 🐢 All with zero backend, zero tracking, and maximum weird little vibe

It’s fintech, but if your accountant was a feral cat with TailwindCSS.

---

## 🧠 Why Though?

This was born from a mate yelling "Copilot’s cooked it again" and Dutchie going full goblin-mode.

No logins. No cloud. No SaaS fees. Just you, your trauma-spending, and some nicely rounded UI boxes.

---

## 📦 Features

- 🗃️ Multi-file upload (CSV, XLS; PDF optional via Tesseract.js)
- 🪄 Smart column matching (`Date`, `Amount`, `Description`, `Account`)
- 🧮 Live summary of income, expenses, net (per account too)
- 🕵️‍♂️ Search + filter transactions in-browser
- 💾 Download full transaction set to `.xlsx` for safekeeping
- 🧚‍♀️ Fully styled with a soft, fintech-playful vibe
- 🫥 No backend. No cookies. No corporate eye contact.

---

## 🧰 Tech Stack

| Part | Tool |
|------|------|
| UI | React + TailwindCSS |
| Table Magic | TanStack Table |
| File Parsing | PapaParse, SheetJS |
| Exporting | FileSaver.js + xlsx |
| OCR (Optional) | Tesseract.js |
| State Management | Zustand (or vibes) |

---

## 🔧 Dev Setup

```bash
npm install
npm run dev
