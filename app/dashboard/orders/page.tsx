import { redirect } from "next/navigation";
// Orders now live on the income page, beside the revenue they add up to.
export default function Orders() {
  redirect("/dashboard/income");
}
