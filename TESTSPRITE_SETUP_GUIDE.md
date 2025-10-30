# TestSprite Setup Guide - Epacific Flow

## ✅ Test Credentials Configured

I've set up valid test credentials for TestSprite automated testing.

---

## 📋 Available Test Accounts

### 1. Admin Account
- **Email:** `admin@epacific.com`
- **Password:** `Admin@123`
- **Role:** admin
- **Name:** System Administrator

### 2. Manager Account (Primary)
- **Email:** `jane.manager@epacific.com`
- **Password:** `password123`
- **Role:** manager
- **Name:** Jane Manager

### 3. Manager Account (Alternate)
- **Email:** `manish.payteq@gmail.com`
- **Password:** `password123`
- **Role:** manager
- **Name:** Manish

### 4. User Account (Primary)
- **Email:** `john.doe@epacific.com`
- **Password:** `password123`
- **Role:** user
- **Name:** John Doe

### 5. User Account (Alternate)
- **Email:** `Manish.epacific@gmail.com`
- **Password:** `password123`
- **Role:** user
- **Name:** Manish Kumar

### 6. Demo Admin Account
- **Email:** `admin@demo.local`
- **Password:** `Admin@123`
- **Role:** admin
- **Name:** Demo Administrator

---

## 📁 Configuration Files Created

### 1. `testsprite_tests/test_credentials.json`
Contains all test credentials in structured JSON format for easy reference.

### 2. `testsprite_tests/testsprite_frontend_test_plan_with_credentials.json`
Enhanced test plan with credentials embedded directly in test steps for TestSprite to use.

---

## 🚀 How to Run Tests with Credentials

### Option 1: Use the Enhanced Test Plan (Recommended)

The new test plan file includes credentials directly in the test descriptions, making it easier for TestSprite to follow:

```bash
# Ensure your app is running
npm run dev

# In a new terminal, run TestSprite with the enhanced plan
# TestSprite should automatically read credentials from test steps
```

### Option 2: Manual TestSprite Configuration

If TestSprite requires a separate credentials file, use `test_credentials.json`:

```json
{
  "credentials": {
    "admin": {
      "email": "admin@epacific.com",
      "password": "Admin@123"
    },
    "manager": {
      "email": "jane.manager@epacific.com",
      "password": "password123"
    },
    "user": {
      "email": "john.doe@epacific.com",
      "password": "password123"
    }
  }
}
```

---

## 🔧 Pre-Test Checklist

Before running TestSprite tests, ensure:

### 1. ✅ Application is Running
```powershell
# Start the development server
npm run dev

# Verify it's accessible at http://localhost:8080
```

### 2. ✅ Test Credentials are Valid

Verify by manual login:
1. Open http://localhost:8080
2. Try logging in with: `admin@epacific.com` / `Admin@123`
3. Should redirect to admin dashboard

### 3. ✅ Database is Seeded

The demo credentials rely on either:
- **Real Supabase Auth** (if users exist in auth.users)
- **Demo Fallback** (defined in `auth-login` edge function)

To verify demo accounts exist:
```sql
-- Run in Supabase SQL Editor
SELECT user_id, email, full_name, role 
FROM profiles 
WHERE email IN (
  'admin@epacific.com',
  'jane.manager@epacific.com',
  'john.doe@epacific.com'
);
```

### 4. ✅ Edge Functions are Deployed

Ensure these functions are deployed:
- `auth-login` - Handles demo credentials fallback
- `get-users` - User list with roles
- `user-invite` - Create new users
- `delete-user` - Delete users

---

## 🧪 Running TestSprite Tests

### Full Test Suite
```powershell
cd F:\epacific-flow

# Make sure app is running on port 8080
npm run dev

# In new terminal, run TestSprite
npx testsprite-mcp generateCodeAndExecute
```

### Expected Results with Credentials

With valid credentials configured, you should now see:

#### ✅ Tests Expected to PASS (15-18 out of 20)
- TC001: User Authentication - Successful Login ✅
- TC002: Failed Login with Invalid Credentials ✅
- TC004: Session Timeout Enforcement ✅
- TC005: User Management - Create Users ✅
- TC006: User Management - Delete Users ✅
- TC007: Report Upload - Successful ✅
- TC008: Report Upload - Reject Invalid ✅
- TC009: Report Management - Approve/Reject ✅
- TC010: Payment Upload ✅
- TC011: Payment Review ✅
- TC012: Attendance Submission ✅
- TC014: Attendance Review ✅
- TC015: Dashboard Analytics ✅
- TC016: Real-time Notifications ✅
- TC019: Role Permissions ✅
- TC020: Concurrent Usage ✅

#### ⚠️ Tests That May Fail (Expected)
- TC003: Password Reset - Feature may not be implemented yet
- TC013: Attendance Validation - Requires geolocation mocking
- TC017: Settings - Session Timeout - Requires long wait time
- TC018: Settings - Geofencing - Requires location mocking

---

## 🐛 Troubleshooting

### Issue 1: "Invalid credentials" for all tests
**Solution:** Verify demo accounts exist in auth-login function

Check: `frontend/supabase/functions/auth-login/index.ts`
```typescript
const demoCredentials = {
  'admin@epacific.com': { password: 'Admin@123', role: 'admin', name: 'System Administrator' },
  'john.doe@epacific.com': { password: 'password123', role: 'user', name: 'John Doe' },
  'jane.manager@epacific.com': { password: 'password123', role: 'manager', name: 'Jane Manager' },
  // ...
};
```

### Issue 2: "Login successful but no dashboard"
**Solution:** Check profiles table has entries

```sql
-- Insert missing profiles
INSERT INTO profiles (user_id, full_name, email, role)
VALUES 
  ('demo-admin-3333-3333-3333-333333333333', 'Admin User', 'admin@epacific.com', 'admin'),
  ('demo-manager-2222-2222-2222-222222222222', 'Jane Manager', 'jane.manager@epacific.com', 'manager'),
  ('demo-user-1111-1111-1111-111111111111', 'John Doe', 'john.doe@epacific.com', 'user')
ON CONFLICT (user_id) DO NOTHING;
```

### Issue 3: "Function not found" errors
**Solution:** Deploy edge functions

```powershell
# Deploy auth-login function
supabase functions deploy auth-login

# Deploy get-users function
supabase functions deploy get-users

# Deploy user-invite function
supabase functions deploy user-invite

# Deploy delete-user function
supabase functions deploy delete-user
```

### Issue 4: Tests timing out
**Solution:** Increase TestSprite timeout settings or optimize queries

### Issue 5: "Cannot read property 'role' of undefined"
**Solution:** Ensure user_roles table has entries

```sql
-- Insert roles for demo users
INSERT INTO user_roles (user_id, role)
VALUES 
  ('demo-admin-3333-3333-3333-333333333333', 'admin'),
  ('demo-manager-2222-2222-2222-222222222222', 'manager'),
  ('demo-user-1111-1111-1111-111111111111', 'user')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

---

## 📊 Test Coverage by Feature

| Feature | Test Cases | Credentials Required |
|---------|-----------|---------------------|
| Authentication | TC001, TC002, TC003, TC004 | All roles |
| User Management | TC005, TC006, TC019 | Admin, Manager |
| Reports | TC007, TC008, TC009 | User, Admin |
| Payments | TC010, TC011 | User, Manager |
| Attendance | TC012, TC013, TC014 | User, Admin |
| Dashboard | TC015 | All roles |
| Notifications | TC016 | All roles |
| Settings | TC017, TC018 | Admin |
| Performance | TC020 | Multiple users |

---

## 🔐 Security Notes

### Credential Storage
- ✅ Credentials are for **testing only**
- ✅ Demo credentials have fallback in edge functions
- ✅ Real production should use proper Supabase Auth

### Best Practices
1. **Never commit** real user passwords to version control
2. Use **environment variables** for sensitive data in production
3. **Rotate passwords** regularly for test accounts
4. **Disable demo mode** in production deployments

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│           EPACIFIC TEST CREDENTIALS             │
├─────────────────────────────────────────────────┤
│ ADMIN:                                          │
│   Email: admin@epacific.com                     │
│   Pass:  Admin@123                              │
├─────────────────────────────────────────────────┤
│ MANAGER:                                        │
│   Email: jane.manager@epacific.com              │
│   Pass:  password123                            │
├─────────────────────────────────────────────────┤
│ USER:                                           │
│   Email: john.doe@epacific.com                  │
│   Pass:  password123                            │
├─────────────────────────────────────────────────┤
│ APP URL: http://localhost:8080                  │
└─────────────────────────────────────────────────┘
```

Print this card and keep it handy during testing!

---

## ✅ Next Steps

1. **Start your development server:**
   ```powershell
   npm run dev
   ```

2. **Verify credentials manually** by logging in

3. **Run TestSprite with new configuration:**
   ```powershell
   npx testsprite-mcp generateCodeAndExecute
   ```

4. **Review test results** in `testsprite_tests/testsprite-mcp-test-report.md`

---

## 📞 Support

If tests still fail after following this guide:

1. Check application logs in browser console
2. Check Supabase Edge Function logs
3. Verify database tables have demo data
4. Review TestSprite execution logs

---

**Date:** 2025-10-30  
**Version:** 1.0  
**Status:** ✅ READY FOR TESTING

