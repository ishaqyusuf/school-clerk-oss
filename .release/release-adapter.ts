import {
  runConsumerReleaseCheck,
  type ConsumerReleaseContext,
} from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/consumer";
import { createSchoolClerkProviderBindings } from "./school-clerk-provider-bundle";

export async function checkRelease(context: ConsumerReleaseContext) {
  return runConsumerReleaseCheck(context, createSchoolClerkProviderBindings(context));
}
