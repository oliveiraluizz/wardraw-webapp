import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { ProfileEditor } from "@/components/flows/ProfileEditor";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Display,
  ErrorBox,
  Eyebrow,
  Field,
  Input,
  Notice,
  PageLoader,
  Select,
} from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog, useMaxProfileTypes, useMe, useMeMutation, useProfileTypeModules } from "@/infra/hooks/queries";
import { billingService, meService, profilesService } from "@/infra/services/me.service";
import type { ProfileType } from "@/types/domain";
import { ago, SUBSCRIPTION_STATUS_LABEL } from "@/utils/format";

const STATUS: Record<string, { label: string; tone: "muted" | "gold" | "ok" | "hot" }> = {
  draft: { label: "Rascunho", tone: "muted" },
  pending_review: { label: "Em análise", tone: "gold" },
  approved: { label: "Aprovado", tone: "ok" },
  rejected: { label: "Precisa de ajustes", tone: "hot" },
  suspended: { label: "Suspenso", tone: "hot" },
};
export default function AccountPage() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="perfis/novo" element={<NewProfile />} />
      <Route path="perfis/:id" element={<ProfileEditor />} />
    </Routes>
  );
}

function Dashboard() {
  const { data: me, isLoading, error } = useMe();
  const { signOut } = useAuth();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: meService.notifications });
  const privacy = useMeMutation((b: Record<string, boolean>) => meService.updatePrivacy(b));
  const consent = useMeMutation((t: string) => meService.consent(t, true));
  const cancel = useMeMutation((id: string) => billingService.cancel(id));
  const markRead = useMutation({ mutationFn: meService.markAllRead, onSuccess: () => notifications.refetch() });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deletion = useMeMutation(() => meService.requestDeletion());

  if (isLoading) return <PageLoader />;
  if (error || !me)
    return (
      <Container className="py-12">
        <ErrorBox error={error} />
      </Container>
    );

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>{me.user.email}</Eyebrow>
            <Display className="text-4xl">Minha conta</Display>
          </div>
          <ButtonLink to="/conta/perfis/novo" variant="secondary">
            Ativar outro perfil
          </ButtonLink>
        </div>
        {me.pendingConsents.length > 0 && (
          <Notice>
            Para continuar, aceite os termos de uso e a política de privacidade (versão {me.pendingConsents[0].version}
            ).{" "}
            <Button
              size="sm"
              className="ml-2"
              loading={consent.isPending}
              onClick={() => me.pendingConsents.forEach((c) => consent.mutate(c.type))}
            >
              Aceitar
            </Button>
          </Notice>
        )}
        {!me.profiles.length && (
          <Card className="flex flex-col items-start gap-3">
            <span className="text-lg font-bold">Você ainda não tem perfil</span>
            <ButtonLink to="/conta/perfis/novo">Criar meu perfil</ButtonLink>
          </Card>
        )}
        {me.profiles.map((p) => {
          const sub = me.subscriptions.find(
            (s) => s.profileId === p.id && ["trialing", "active", "past_due", "pending_payment"].includes(s.status),
          );
          const st = STATUS[p.status];
          return (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold">{p.displayName}</span>
                <Chip>
                  {{ fighter: "Lutador", coach: "Coach", organizer: "Organizador", provider: "Prestador" }[p.type]}
                </Chip>
                <Chip tone={st.tone}>{st.label}</Chip>
                {p.searchable ? <Chip tone="ok">Aparece na busca</Chip> : <Chip>Fora da busca</Chip>}
              </div>
              {p.statusReason && <Notice tone="hot">{p.statusReason}</Notice>}
              {!p.searchable && p.searchBlockers.length > 0 && (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
                  {p.searchBlockers.map((b) => (
                    <li key={b.code}>{b.message}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {sub ? (
                  <>
                    <Chip tone="gold">
                      {sub.plan?.name} · {SUBSCRIPTION_STATUS_LABEL[sub.status]}
                    </Chip>
                    {sub.status === "trialing" && sub.trialEndsAt && (
                      <span className="text-ink-muted">Teste termina {ago(sub.trialEndsAt)}</span>
                    )}
                    {sub.cancelAtPeriodEnd ? (
                      <span className="text-ink-muted">Cancela no fim do período</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={cancel.isPending}
                        onClick={() => confirm("Cancelar a assinatura deste perfil?") && cancel.mutate(sub.id)}
                      >
                        Cancelar assinatura
                      </Button>
                    )}
                  </>
                ) : (
                  <ButtonLink to={`/planos?tipo=${p.type}`} size="sm">
                    Escolher plano
                  </ButtonLink>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink to={`/conta/perfis/${p.id}`} variant="secondary" size="sm">
                  Editar perfil
                </ButtonLink>
                {p.status === "approved" && (
                  <ButtonLink to={`/p/${p.slug}`} variant="ghost" size="sm">
                    Ver página pública
                  </ButtonLink>
                )}
                {p.type === "organizer" && (
                  <ButtonLink to="/organizador" variant="ghost" size="sm">
                    Painel do organizador
                  </ButtonLink>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold">Notificações</span>
            {!!me.unreadNotifications && (
              <button type="button" className="text-xs text-brand-hot" onClick={() => markRead.mutate()}>
                Marcar como lidas
              </button>
            )}
          </div>
          {(notifications.data ?? []).slice(0, 8).map((n) => (
            <div key={n.id} className={`text-sm ${n.readAt ? "text-ink-muted" : ""}`}>
              <span className="font-semibold">{n.title}</span>
              {n.body && <span className="block text-xs text-ink-muted">{n.body}</span>}
            </div>
          ))}
          {!notifications.data?.length && <span className="text-sm text-ink-muted">Nada por aqui.</span>}
        </Card>
        <Card className="flex flex-col gap-3">
          <span className="font-bold">Privacidade</span>
          {(
            [
              ["profileHidden", "Ocultar meus perfis da busca e das páginas públicas"],
              ["allowComparison", "Aparecer em comparações de outros lutadores"],
              ["showServiceRecords", "Mostrar atendimentos confirmados"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-start gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-brand"
                checked={!!me.privacy[k]}
                onChange={(e) => privacy.mutate({ [k]: e.target.checked })}
              />
              {l}
            </label>
          ))}
        </Card>
        <Card className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => void signOut()}>
            Sair
          </Button>
          {confirmDelete ? (
            <Notice tone="hot">
              Seus perfis saem da busca agora e os dados são apagados em até 24 h.{" "}
              <Button
                size="sm"
                className="mt-2"
                loading={deletion.isPending}
                onClick={() => deletion.mutate(undefined)}
              >
                Confirmar exclusão
              </Button>
            </Notice>
          ) : (
            <button type="button" className="text-sm text-ink-muted underline" onClick={() => setConfirmDelete(true)}>
              Excluir conta e dados
            </button>
          )}
          {deletion.isSuccess && <Notice tone="ok">Pedido de exclusão registrado.</Notice>}
        </Card>
      </aside>
    </Container>
  );
}

/** Screen "Tipo de cadastro": choose the profile to start with; more can be activated later. */
function NewProfile() {
  const [params] = useSearchParams();
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [type, setType] = useState<ProfileType | null>((params.get("tipo") as ProfileType) || null);
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const create = useMeMutation(() =>
    profilesService.create({ type: type!, displayName: name, cityId: cityId || undefined }),
  );
  const existing = new Set(me?.profiles.map((p) => p.type));
  const { isLocked } = useProfileTypeModules();
  const maxTypes = useMaxProfileTypes();
  const creatable = new Set(me?.creatableProfileTypes ?? []);
  /** Why a type cannot be picked: already active, module still locked or the account's type limit. */
  const blockedReason = (code: ProfileType): string | null => {
    if (existing.has(code)) return "Já ativo";
    if (isLocked(code)) return "Em breve";
    if (me && !creatable.has(code)) return "Indisponível para esta conta";
    return null;
  };
  const featured = catalog?.serviceFamilies.flatMap((f) => f.categories.filter((c) => c.featuredInOnboarding)) ?? [];

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-10">
      <div>
        <Eyebrow>Criar conta</Eyebrow>
        <Display className="text-4xl">Como você vai usar o Wardraw?</Display>
        <p className="mt-2 text-ink-soft">
          {maxTypes > 1
            ? "Escolha um perfil para começar. Depois dá para ativar outros na mesma conta."
            : "Escolha o tipo de perfil da sua conta."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {catalog?.profileTypes.map((t) => (
          <button
            key={t.code}
            type="button"
            disabled={!!blockedReason(t.code)}
            onClick={() => setType(t.code)}
            className={`flex flex-col gap-2 rounded-card border p-4 text-left disabled:opacity-50 ${type === t.code ? "border-brand-hot bg-brand-deep" : "border-line bg-surface hover:bg-surface-2"}`}
          >
            <span className="flex items-center gap-2 font-display text-2xl uppercase">
              {t.name}
              {t.code === "organizer" && !isLocked(t.code) && <Chip tone="gold">Gestão completa de eventos</Chip>}
              {blockedReason(t.code) && <Chip tone={isLocked(t.code) ? "gold" : "muted"}>{blockedReason(t.code)}</Chip>}
            </span>
            <span className="text-sm text-ink-soft">{t.description}</span>
            {t.code === "provider" && (
              <span className="flex flex-wrap gap-1.5">
                {featured.map((c) => (
                  <Chip key={c.id}>{c.professionalTitle}</Chip>
                ))}
                <Chip>Outro serviço</Chip>
              </span>
            )}
          </button>
        ))}
      </div>
      {type && (
        <Card className="flex flex-col gap-4">
          <Field
            label={type === "organizer" ? "Nome ou razão social" : type === "fighter" ? "Seu nome" : "Nome no perfil"}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </Field>
          <Field label="Cidade">
            <Select value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">Escolha</option>
              {catalog?.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {create.error && <ErrorBox error={create.error} />}
          <Button
            size="lg"
            disabled={name.trim().length < 2}
            loading={create.isPending}
            onClick={() => create.mutate(undefined, { onSuccess: (p) => navigate(`/conta/perfis/${p.id}`) })}
          >
            Continuar
          </Button>
          <p className="text-xs text-ink-muted">Todo plano começa com um período de teste.</p>
        </Card>
      )}
      <Link to="/conta" className="text-sm text-ink-muted">
        Voltar
      </Link>
    </Container>
  );
}
