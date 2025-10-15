import { Img, Section } from "@react-email/components";

import { getAppUrl } from "@school-clerk/utils/envs";

const baseUrl = getAppUrl();

export function Logo() {
  return (
    <Section className="mt-[32px]">
      <Img
        src={`${baseUrl}/email/logo.png`}
        width="45"
        height="45"
        alt="GndMillwork"
        className="mx-auto my-0 block"
      />
    </Section>
  );
}
