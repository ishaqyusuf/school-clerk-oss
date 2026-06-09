import { auth } from './apps/dashboard/src/auth/server';
import { prisma } from './packages/db/src/prisma';
import crypto from 'crypto';

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) return;
  
  const token = crypto.randomUUID();
  await prisma.verification.create({
    data: {
      identifier: `reset-password:${user.id}`,
      value: token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60)
    }
  });
  
  // Now try to use the token
  try {
    const res = await auth.api.resetPassword({
      body: { newPassword: "password123", token },
      headers: new Headers()
    });
    console.log("Success?", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
test().catch(console.error);
