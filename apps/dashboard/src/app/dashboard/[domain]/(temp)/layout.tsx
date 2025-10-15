import { Header } from "./header";

export default async function Layout({ children, params }) {
  return (
    <>
      <Header />
      <div className="p-6">{children}</div>
    </>
  );
}
