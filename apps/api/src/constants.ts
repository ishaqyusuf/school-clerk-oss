export const transactionStatus = ["success", "cancelled"] as const;

export type TransactionStatus = (typeof transactionStatus)[number];

export const transactionTypes = ["credit", "debit"] as const;

export type TransactionTypes = (typeof transactionTypes)[number];

export const studentFeeStatus = ["active", "cancelled"] as const;

export type StudentFeeStatus = (typeof studentFeeStatus)[number];
