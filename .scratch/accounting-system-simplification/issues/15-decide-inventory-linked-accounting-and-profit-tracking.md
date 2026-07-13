Type: grilling
Status: open
Blocked by: 04, 05, 06, 07, 14

## Question

How should inventory-like school activities connect to accounting and profit tracking?

Resolve:
- whether activities such as uniforms, books, and other resold items should have dedicated project/product accounts;
- how purchase cost, production/labor cost, stock quantity, sales income, and profit should be connected;
- whether selling uniforms/books should return money to the same account that funded purchase/production;
- whether profit should be shown per product/project account, per term, or both;
- what happens when multiple accounts fund one purchase or production run;
- whether inventory tracking is in scope for this accounting implementation or only the accounting hooks/read model are in scope;
- how student sales/collections connect to the receive-payment simplification map.

The answer should decide whether this effort owns full inventory accounting or only the finance/accounting side of inventory-linked activity.

## Initial direction from user input

Example workflow: the school creates or uses a Uniform Account, transfers money into it, buys uniform cloth in bulk, pays tailors, then records student uniform sales back into the same account so the school can see balance and profit.

## Approved direction

Support product/project accounts for activities like uniforms and books.

Example: **Uniform Account**

- transfer money into Uniform Account;
- buy cloth from that account;
- pay tailors from that account;
- sell uniforms to students;
- income returns into Uniform Account;
- system shows cost, sales, balance, and profit/loss.

For v1, do not build a full inventory warehouse system unless needed. Instead, build accounting hooks that can track:

- purchase cost;
- production/labor cost;
- sales income;
- remaining balance;
- profit/loss per account/project.

Uniforms, books, and similar resale items should connect to the receive-payment simplification flow as payment types/items.
