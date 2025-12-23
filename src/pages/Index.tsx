const Index = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <section className="container max-w-xl space-y-6 rounded-2xl border bg-card px-6 py-10 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:px-10 sm:py-12">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Projeto em branco
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Comece com uma base limpa e organizada
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Esta tela é apenas um ponto de partida. Use este espaço para criar
            exatamente o que você precisa, sem distrações nem conteúdo desnecessário.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Index;
