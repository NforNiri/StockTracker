import Link from "next/link";
import Image from "next/image";
import NavItems from "./NavItems";
import UserDropdown from "./UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { User } from "@/types/global";

const Header = async ({ user }: { user: User }) => {

  const initialStocks = await searchStocks();
  
  // Debug log for checking data flow
  // console.log("Header received initialStocks:", initialStocks?.length || 0);

  return (
    <header className="sticky top-0 header">
      <div className="container header-wrapper">
        <Link href="/">
          <Image
            src="/assets/icons/logo-transparent.png"
            alt="StockUp"
            width={160}
            height={40}
            className="h-14 w-auto cursor-pointer"
            style={{ width: "auto" }}
            priority
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
