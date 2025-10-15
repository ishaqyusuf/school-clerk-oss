import { revalidatePath, revalidateTag } from "next/cache";

import { getAuthCookie } from "../cookies/auth-cookie";

export function billablesChanged() {
  revalidatePath("/finance/billables");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`billables_${termId}`,);
    // revalidateTag(`billables_filter_${termId}`);
  });
}
export function billChanged() {
  revalidatePath("/finance/bills");
  // getAuthCookie().then(({ termId }) => {
  //   // revalidateTag(`staffs_${termId}`);
  //   // revalidateTag(`staffs_filter_${termId}`);
  // });
}
export function classChanged() {
  revalidatePath("/academic/classes");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`classrooms_${termId}`);
    // revalidateTag(`students_class_filter_${termId}`);
  });
}
export function feesChanged() {
  revalidatePath("/finance/fees-management");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`feees_${termId}`);
    // revalidateTag(`fees_filter_${termId}`);
  });
}
export function staffChanged() {
  revalidatePath("/staff/teachers");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`staffs_${termId}`);
    // revalidateTag(`staffs_filter_${termId}`);
  });
}
export function studentChanged() {
  revalidatePath("/students/list");
  getAuthCookie().then(({ termId }) => {
    // // revalidateTag(`classrooms_${termId}`);
  });
}
export function subjectChanged() {
  revalidatePath("/academic/subjects");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`subjects_${termId}`);
    // revalidateTag(`subjects_filter_${termId}`);
  });
}
export function walletAdded() {
  // revalidatePath("/academic/subjects");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`wallets_${termId}`);
    // revalidateTag(`wallet_filter_${termId}`);
  });
}
export function walletTxChanged(walletName) {
  // revalidatePath("/academic/subjects");
  getAuthCookie().then(({ termId }) => {
    // revalidateTag(`wallets_tx_${termId}_${walletName}`);
    // revalidateTag(`wallet_filter_${termId}_${walletName}`);
  });
}
