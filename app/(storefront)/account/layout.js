import AccountTabs from "@/components/AccountTabs";

export default function AccountLayout({ children }) {
  return (
    <>
      <div className="page-shell">
        <AccountTabs />
      </div>
      {children}
    </>
  );
}
