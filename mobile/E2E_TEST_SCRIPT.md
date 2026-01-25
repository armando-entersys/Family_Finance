# Family Finance Mobile - E2E Test Script

## Test Environment
- URL: http://localhost:8083
- Platform: Web (Expo)
- API: https://Family-Finance.scram2k.com

## Test Credentials
- Email: qa_test@familyfinance.com
- Password: QaTest123

---

## Test Suite 1: Authentication

### TEST-001: Login Flow
1. Open http://localhost:8083
2. Verify redirect to login screen
3. Enter email: qa_test@familyfinance.com
4. Enter password: QaTest123
5. Click "Iniciar Sesion"
6. **Expected**: Redirect to Dashboard

### TEST-002: Session Persistence
1. After login, refresh the browser
2. **Expected**: Should remain logged in, Dashboard displayed

### TEST-003: Logout
1. Navigate to Profile tab
2. Click "Cerrar Sesion"
3. **Expected**: Redirect to Login screen

---

## Test Suite 2: Dashboard

### TEST-004: Dashboard Display
1. Login and view Dashboard
2. **Expected**:
   - Balance card shows "$0.00" (new user)
   - Income and Expense indicators visible
   - Quick action buttons present
   - "Transacciones Recientes" section visible

### TEST-005: Quick Actions
1. Click "Agregar" quick action
2. **Expected**: Navigate to Add Expense screen

### TEST-006: Pull to Refresh
1. On Dashboard, pull down (or scroll up past top)
2. **Expected**: Loading indicator, data refreshes

---

## Test Suite 3: Add Transaction

### TEST-007: Manual Expense Entry
1. Navigate to Add Expense screen
2. Keep type as "Gasto"
3. Enter amount: 150.50
4. Enter description: "Test Supermercado"
5. Select category: "Comida"
6. Click "Guardar"
7. **Expected**: Success alert, redirect to previous screen

### TEST-008: Manual Income Entry
1. Navigate to Add Expense screen
2. Toggle to "Ingreso"
3. Enter amount: 5000
4. Enter description: "Test Salario"
5. Click "Guardar"
6. **Expected**: Success alert, redirect to previous screen

### TEST-009: Amount Validation
1. Navigate to Add Expense screen
2. Leave amount empty or enter 0
3. Click "Guardar"
4. **Expected**: Error alert "Ingresa un monto valido"

### TEST-010: Photo Selection (Web)
1. Navigate to Add Expense screen
2. Click "Galeria" button
3. Select an image
4. **Expected**: Image preview displayed, AI processing indicator shown

---

## Test Suite 4: Transactions List

### TEST-011: Transaction List Display
1. Navigate to Transactions tab
2. **Expected**:
   - Created transactions visible
   - Filter chips present (Todos, Gastos, Ingresos, etc.)

### TEST-012: Filter Transactions
1. Click "Gastos" filter
2. **Expected**: Only EXPENSE type transactions shown
3. Click "Ingresos" filter
4. **Expected**: Only INCOME type transactions shown
5. Click "Todos"
6. **Expected**: All transactions shown

### TEST-013: Transaction Detail
1. Click on a transaction
2. **Expected**: Navigate to detail view with full information

---

## Test Suite 5: Navigation

### TEST-014: Tab Navigation
1. Click each tab: Inicio, Gastos, Metas, Perfil
2. **Expected**: Correct screen displayed for each tab

### TEST-015: Add Button Navigation
1. On Transactions screen, click (+) button
2. **Expected**: Navigate to Add Expense screen

---

## Test Suite 6: Error Handling

### TEST-016: Network Error
1. Disable network connection
2. Attempt to load Dashboard
3. **Expected**: Appropriate error message displayed

### TEST-017: Invalid Login
1. Logout first
2. Enter wrong password
3. **Expected**: Error message "Credenciales incorrectas" or similar

---

## Test Execution Checklist

| Test ID | Status | Notes |
|---------|--------|-------|
| TEST-001 | | |
| TEST-002 | | |
| TEST-003 | | |
| TEST-004 | | |
| TEST-005 | | |
| TEST-006 | | |
| TEST-007 | | |
| TEST-008 | | |
| TEST-009 | | |
| TEST-010 | | |
| TEST-011 | | |
| TEST-012 | | |
| TEST-013 | | |
| TEST-014 | | |
| TEST-015 | | |
| TEST-016 | | |
| TEST-017 | | |

---

## Sign-off

**QA Tester**: _______________
**Date**: _______________
**Version**: 1.0.0-beta
