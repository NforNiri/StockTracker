import Link from "next/link";

const FooterLink = ({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) => {
  return (
    <div className="text-center pt-4">
      <p className="text-gray-500 text-sm">
        {text}{" "}
        <Link href={href} className="footer-link">
          {linkText}
        </Link>
      </p>
    </div>
  );
};

export default FooterLink;
