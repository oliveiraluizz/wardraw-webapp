import { CalendarCheck, Dumbbell, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { EventRowCard } from "@/components/flows/cards";
import { OpponentForm, opponentToSearch } from "@/components/flows/OpponentForm";
import { ButtonLink, Card, Display, Eyebrow, Spinner } from "@/components/shared/ui";
import { useAgenda, useCatalog } from "@/infra/hooks/queries";

export default function HomePage() {
  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const rio = catalog?.cities.find((c) => c.slug === "rio-de-janeiro-rj");
  const { data: agenda, isLoading } = useAgenda({ cityId: rio?.id });
  const categories = catalog?.serviceFamilies.flatMap((f) => f.categories) ?? [];

  const pillars = [
    {
      icon: Dumbbell,
      title: "Sparring sob medida",
      text: "Filtre atletas por altura, envergadura, peso, guarda e base. Resultados ordenados por semelhança com o seu adversário.",
      cta: "Buscar sparring",
      to: "/sparring",
    },
    {
      icon: Users,
      title: "Seu time de camp",
      text: "Aparador de manopla, fisioterapeuta, psicólogo, nutricionista, fotógrafo. Encontre por cidade e modalidade.",
      cta: "Ver serviços",
      to: "/servicos",
    },
    {
      icon: CalendarCheck,
      title: "Gestão de eventos",
      text: "Crie o evento, receba inscrições, monte chaves ou card, faça a pesagem e publique os resultados, que atualizam o cartel dos atletas.",
      cta: "Ver painel do organizador",
      to: "/organizador",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/20 blur-3xl"
          aria-hidden
        />
        <Container className="relative grid items-center gap-12 py-14 lg:grid-cols-[1fr_480px] lg:gap-16 lg:py-[72px]">
          <div className="flex flex-col gap-6">
            <Eyebrow>Sparring · Serviços · Eventos</Eyebrow>
            <Display className="text-5xl leading-[0.98] sm:text-6xl lg:text-[76px]">
              Treine contra quem
              <br />
              parece o seu
              <br />
              <span className="text-brand-hot">adversário</span>
            </Display>
            <p className="max-w-[540px] text-lg leading-relaxed text-ink-soft lg:text-[19px]">
              Encontre sparrings pelo biotipo e pelo estilo, monte o time do seu camp e acompanhe os eventos da sua
              cidade. E organize seus eventos do começo ao fim.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/entrar?criar=1" size="lg">
                Criar meu perfil
              </ButtonLink>
              <ButtonLink to="/entrar?criar=1&tipo=organizer" variant="secondary" size="lg">
                Sou organizador
              </ButtonLink>
            </div>
          </div>
          <Card className="flex flex-col gap-4 p-6">
            <Display as="h2" className="text-2xl">
              Perfil do adversário
            </Display>
            <OpponentForm compact onSubmit={(p) => navigate(`/sparring?${opponentToSearch(p).toString()}`)} />
          </Card>
        </Container>
      </section>

      <Container className="grid gap-4 pb-16 md:grid-cols-3">
        {pillars.map((p) => (
          <Card key={p.title} className="flex flex-col gap-3 p-6">
            <p.icon className="h-7 w-7 text-brand-hot" aria-hidden />
            <h3 className="font-display text-2xl uppercase">{p.title}</h3>
            <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{p.text}</p>
            <Link to={p.to} className="font-bold text-brand-hot hover:text-brand-hover">
              {p.cta} →
            </Link>
          </Card>
        ))}
      </Container>

      <section className="border-y border-line bg-surface py-14">
        <Container className="flex flex-col gap-8">
          <Display as="h2" className="text-4xl">
            Como funciona
          </Display>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                "01",
                "Monte o perfil",
                "Atleta com fotos e medidas, prestador com portfólio, organizador com seus eventos.",
              ],
              ["02", "Seja encontrado", "Quem precisa filtra pelo que importa e chega até você."],
              ["03", "Combine direto", "O contato vai para o seu WhatsApp. Valor e pagamento são entre vocês."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex flex-col gap-2">
                <span className="font-cond text-5xl font-bold text-brand-hot">{n}</span>
                <span className="text-xl font-bold">{t}</span>
                <p className="text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-5 py-14">
        <Display as="h2" className="text-4xl">
          Monte o time do seu camp
        </Display>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/servicos"
            className="rounded-full border border-brand-hot bg-brand-deep px-4 py-2 text-sm font-semibold text-brand-hot"
          >
            Todas as categorias
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/servicos?categoria=${c.id}`}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-2"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col gap-5 pb-16">
        <div className="flex items-end justify-between">
          <Display as="h2" className="text-4xl">
            Eventos no Rio este mês
          </Display>
          <Link to="/eventos" className="font-bold text-brand-hot">
            Agenda completa →
          </Link>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {(agenda?.results ?? []).slice(0, 3).map((e) => (
              <EventRowCard key={e.id} event={e} />
            ))}
            {!agenda?.results.length && <p className="text-ink-muted">Nenhum evento publicado ainda.</p>}
          </div>
        )}
      </Container>

      <section className="bg-gradient-to-br from-[#3A0E16] to-bg py-16">
        <Container className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <Eyebrow>Para organizadores</Eyebrow>
            <Display as="h2" className="text-4xl lg:text-5xl">
              Seu evento inteiro num lugar só
            </Display>
            <p className="max-w-xl text-ink-soft">
              Inscrições, chaves de Jiu-Jitsu, card de MMA, pesagem e resultados. A taxa de inscrição é combinada direto
              com você.
            </p>
          </div>
          <ButtonLink to="/organizador" size="lg">
            Conhecer o painel
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
