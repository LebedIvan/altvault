import { notFound } from "next/navigation";
import { getByNumber } from "@/lib/legoDb";
import { LegoSetPage } from "@/components/lego/LegoSetPage";

export default function Page({ params }: { params: { setNumber: string } }) {
  const set = getByNumber(params.setNumber);
  if (!set) notFound();
  return <LegoSetPage set={set} />;
}
