-- Reset legacy finance/accounting storage.
--
-- This migration intentionally removes the non-operational finance models so the
-- next finance system can start from a standardized ledger design. The drops are
-- idempotent because one local Prisma run removed these objects before the
-- migration file was recorded.

DROP TABLE IF EXISTS
  "BillInvoice",
  "BillPayment",
  "BillSettlement",
  "BillSettlementRepayment",
  "Billable",
  "BillableHistory",
  "Bills",
  "FeeDiscount",
  "FeeHistory",
  "Fees",
  "Funds",
  "StudentFee",
  "StudentPayment",
  "StudentPurchase",
  "StudentWalletTransactions",
  "Wallet",
  "WalletTransactions",
  "_BillableHistoryToClassRoomDepartment",
  "_ClassRoomDepartmentToFeeHistory"
CASCADE;

DROP TYPE IF EXISTS "BillSettlementStatus" CASCADE;
DROP TYPE IF EXISTS "BillType" CASCADE;
DROP TYPE IF EXISTS "CollectionStatus" CASCADE;
DROP TYPE IF EXISTS "StudentPaymentType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "WalletType" CASCADE;
