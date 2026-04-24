import { Img, Section } from "@react-email/components";

import { getAppUrl } from "@school-clerk/utils/envs";

const baseUrl = getAppUrl();

export function Logo() {
  return (
    <Section className="mt-[32px]">
      <Img
        src={`${baseUrl}/logo_mini.png`}
        width="45"
        height="45"
        alt="School Clerk"
        className="mx-auto my-0 block"
      />
    </Section>
  );
}
