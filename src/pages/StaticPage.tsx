import { useParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { Display, EmptyState } from "@/components/shared/ui";

const PAGES: Record<string, { title: string; body: string[] }> = {
  sobre: {
    title: "Sobre o Wardraw",
    body: [
      "O Wardraw junta num só lugar a gestão de eventos de luta e tudo que envolve uma luta: atletas para sparring, profissionais de apoio e a agenda de eventos.",
      "Todo mundo paga uma mensalidade, e a plataforma não cobra comissão sobre serviços nem inscrições.",
    ],
  },
  privacidade: {
    title: "Privacidade e LGPD",
    body: [
      "Fotos de corpo e medidas só são exibidas com o seu consentimento explícito e apenas para usuários logados, sem download direto.",
      "Você pode ocultar o perfil ou excluir a conta e os dados a qualquer momento em Minha conta.",
    ],
  },
  termos: {
    title: "Termos de uso",
    body: [
      "A plataforma conecta as pessoas. A negociação e o pagamento de serviços e inscrições acontecem fora dela, direto entre as partes.",
    ],
  },
  contato: { title: "Contato", body: ["Fale com a equipe Wardraw pelo e-mail contato@wardraw.com.br."] },
};

export default function StaticPage() {
  const { slug } = useParams();
  const page = slug ? PAGES[slug] : undefined;
  if (!page)
    return (
      <Container className="py-16">
        <EmptyState title="Página não encontrada" />
      </Container>
    );
  return (
    <Container className="flex max-w-3xl flex-col gap-4 py-12">
      <Display className="text-4xl">{page.title}</Display>
      {page.body.map((p) => (
        <p key={p} className="text-lg text-ink-soft">
          {p}
        </p>
      ))}
    </Container>
  );
}
