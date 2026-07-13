Type: prototype
Status: open
Blocked by: 03, 04, 05, 06, 07, 08, 13, 14, 15, 16

## Question

What should the bursary/accounting UI workflows look like once the accounting model is decided?

Design a rough product workflow for:
- term ledger overview;
- account/pocket list;
- account statement page;
- receive money;
- pay money;
- transfer funds;
- arrears and late payments;
- term close and carry-forward;
- reconciliation and reports.

The answer should describe the screens, primary actions, empty states, and advanced controls without implementing production UI.

## Approved direction

Build the UI around daily bursary work.

Main screens:

- **Term Ledger Overview**: summary of money in, money out, balances, deficits, arrears.
- **Accounts**: list of accounts/pockets with balance and status.
- **Account Statement**: all transactions for one account.
- **Receive Money**: student payments and other income.
- **Pay Money**: salary, service bills, expenses.
- **Transfer Funds**: move money between accounts.
- **Arrears**: previous-term student balances paid later.
- **Term Close**: guided close and carry-forward wizard.
- **Reports/Reconciliation**: checks and exports.

Default screens should be simple. Corrections and advanced accounting controls should be hidden behind Advanced.
