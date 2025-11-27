import Link from "next/link";
import Image from "next/image";
import NavItems from "./NavItems";
import UserDropdown from "./UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";

const Header = async ({ user }: { user: User }) => {

  const initialStocks = await searchStocks();
  
  // Debug log for checking data flow
  console.log("Header received initialStocks:", initialStocks?.length || 0);

  return (
    <header className="sticky top-0 header">
      <div className="container header-wrapper">
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="StockUp"
            width={140}
            height={32}
            className="h-8 w-auto cursor-pointer"
            style={{ width: "auto" }}
          />
        </Link>
        <nav className="hidden sm:block">
          <NavItems initialStocks={initialStocks} />
        </nav>

        <UserDropdown initialStocks={initialStocks} user={user} />
      </div>
    </header>
  );
};

export default Header;
