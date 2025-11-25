# 🧪 Testing Guide for PDF Searcher

## For Non-Technical Users

This guide explains how to test your PDF Searcher application before deploying to production.

---

## ✅ Quick Start - 3 Simple Steps

### Step 1: Stop Your App (If Running)

If `npm run dev` is running, press `Ctrl+C` to stop it.

### Step 2: Run Tests

```bash
npm run test:smoke
```

**This takes 30 seconds** and tests the most important things.

### Step 3: Check Results

You'll see something like:

```
✓ Application server is running (1.2s)
✓ Database connection works (0.5s)
✓ CRON authentication works (0.3s)

Passed: 7/7 tests ✅
```

**If all tests pass (✅), your app is ready to deploy!**

**If any tests fail (❌), something is broken - see troubleshooting below.**

---

## 🎯 Different Test Commands

| Command | What It Does | Time | When To Use |
|---------|--------------|------|-------------|
| `npm run test:smoke` | Tests critical functionality | 30s | ⭐ Before every deployment |
| `npm run test:api` | Tests all API endpoints | 2min | After making code changes |
| `npm run test` | Tests everything | 5-10min | Before major releases |
| `npm run test:report` | Opens visual test report | instant | To see detailed failure info |

---

## 🔍 Understanding Test Results

### ✅ All Green - Everything Works!

```
✓ Application server is running
✓ Database connection works
✓ API endpoints respond

Passed: 7/7 tests
```

**Action:** Your app is ready! You can deploy.

### ❌ Some Red - Something Broken

```
✓ Application server is running
✓ Database connection works
✗ CRON authentication works (FAILED)

Passed: 6/7 tests
Failed: 1/7 tests
```

**Action:** Don't deploy yet. See what failed and fix it first.

To see details:
```bash
npm run test:report
```

This opens a report in your browser showing:
- Exact error message
- Which test failed
- Why it failed

---

## 🔧 Common Problems & Solutions

### ❌ "Error: Missing environment variables"

**What it means:** The tests can't find your .env.local file

**Fix:**
1. Make sure `.env.local` exists in your project folder
2. Make sure it has these lines:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-key-here
   CRON_SECRET=your-secret-here
   ```

---

### ❌ "Tests fail with 401 Unauthorized"

**What it means:** Authentication is not working

**Fix:**
1. Check `CRON_SECRET` in `.env.local`
2. Make sure Supabase keys are correct
3. Verify your Supabase project is not paused

---

### ❌ "Server not reachable"

**What it means:** The app won't start

**Fix:**
1. Try running `npm run dev` manually first
2. If you see errors, fix those first
3. Then run tests again

---

### ❌ "Database connection error"

**What it means:** Can't connect to Supabase database

**Fix:**
1. Check internet connection
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check if Supabase project is paused (free tier)
4. Go to supabase.com and make sure project is active

---

## 📊 Test Reports

### Visual Report (Recommended)

After tests run, open the visual report:

```bash
npm run test:report
```

This shows:
- ✅ Which tests passed (green)
- ❌ Which tests failed (red)
- 📸 Screenshots of failures
- 📝 Detailed error messages
- ⏱️ How long each test took

### Terminal Output

Tests print results directly in terminal:

```
Running 7 tests using 1 worker

  ✓ Application server is running (1234ms)
  ✓ Database connection works (567ms)
  ✗ CRON authentication works (890ms)

3 passed (2s)
1 failed
```

---

## 🚀 Before Deployment Checklist

Before deploying to production, run:

```bash
npm test:smoke
```

Make sure ALL tests pass:

- ✅ Application server is running
- ✅ Database connection works
- ✅ Connection pool is healthy
- ✅ API endpoints respond
- ✅ CRON authentication works
- ✅ Debug endpoint is protected
- ✅ Environment variables are loaded

**If even ONE test fails, don't deploy! Fix it first.**

---

## 💡 Pro Tips

1. **Always run tests before deploying** - Catches problems before users see them

2. **Run smoke tests after every code change** - Quick way to verify nothing broke

3. **Check the HTML report for failures** - Visual reports are easier to understand

4. **Keep .env.local backed up** - You'll need it to run tests

5. **Run full tests before major releases** - More comprehensive than smoke tests

---

## 🆘 Still Having Issues?

If tests fail and you're not sure why:

1. **Read the error message carefully** - It usually tells you what's wrong

2. **Open the HTML report** - Shows more details:
   ```bash
   npm run test:report
   ```

3. **Check test-results/screenshots/** - Visual evidence of what went wrong

4. **Verify all environment variables** - Tests need these to work

5. **Make sure app runs manually first** - Try `npm run dev`

---

## ✅ You're Ready!

Run this command before every deployment:

```bash
npm run test:smoke
```

If all tests pass, you're good to go! 🚀

---

**For more details, see:** `tests/README.md`
