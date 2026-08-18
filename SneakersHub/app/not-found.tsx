export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl">👟</p>
      <h1 className="font-display text-3xl font-bold">404 — Page not found</h1>
      <p className="text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
    </main>
  );
}
