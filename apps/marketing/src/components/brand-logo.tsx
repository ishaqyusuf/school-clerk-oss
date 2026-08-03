import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  size?: number;
  tone?: "auto" | "light" | "dark";
};

export function BrandLogo({
  className,
  priority = false,
  size = 32,
  tone = "auto",
}: BrandLogoProps) {
  const sharedProps = {
    alt: "School Clerk",
    width: size,
    height: size,
    priority,
    unoptimized: true,
  };

  if (tone === "dark") {
    return (
      <Image src="/brand-mark.svg" className={className} {...sharedProps} />
    );
  }

  if (tone === "light") {
    return (
      <Image
        src="/brand-mark-inverse.svg"
        className={className}
        {...sharedProps}
      />
    );
  }

  return (
    <>
      <Image
        src="/brand-mark.svg"
        className={className ? `${className} dark:hidden` : "dark:hidden"}
        {...sharedProps}
      />
      <Image
        src="/brand-mark-inverse.svg"
        className={
          className ? `hidden ${className} dark:block` : "hidden dark:block"
        }
        {...sharedProps}
      />
    </>
  );
}
