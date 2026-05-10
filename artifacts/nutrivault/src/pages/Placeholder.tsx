import { Layout } from "@/components/layout/Layout";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground border-dashed">
          <p>Esta página se encuentra en construcción.</p>
        </div>
      </div>
    </Layout>
  );
}
