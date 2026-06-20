import { notFound } from "next/navigation";
import { getTrainerById } from "@pacergo/api";
import { TrainerDetailView } from "@/features/trainer/trainer-detail-view";

type Params = { params: Promise<{ id: string; locale: string }> };

export default async function TrainerDetailPage({ params }: Params) {
  const { id } = await params;
  const trainer = await getTrainerById(id);
  if (!trainer) notFound();
  return <TrainerDetailView trainer={trainer} />;
}
