import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { ApiError, get } from "@/infra/api/client";
import { keys, useCatalog } from "@/infra/hooks/queries";
import { meService, profilesService } from "@/infra/services/me.service";
import type { FieldDefinition, OwnerProfile } from "@/types/domain";
import { DAY_LABEL, measure, PERIOD_LABEL } from "@/utils/format";
import {
  Button,
  Card,
  Chip,
  Display,
  ErrorBox,
  Eyebrow,
  Field,
  Input,
  Notice,
  PageLoader,
  PhotoFrame,
  Select,
  Textarea,
  ToggleChip,
} from "../shared/ui";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));
const str = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : String(v));

function useProfile(id: string) {
  return useQuery({ queryKey: keys.profile(`own:${id}`), queryFn: () => profilesService.get(id) });
}

/** Each section saves on its own; the API recomputes search visibility after every change. */
function Section({
  title,
  children,
  onSubmit,
  saving,
  error,
  saved,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (f: FormData) => void;
  saving: boolean;
  error: unknown;
  saved: boolean;
}) {
  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <h2 className="font-display text-2xl uppercase">{title}</h2>
        {children}
        {!!error && <ErrorBox error={error} />}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
          {saved && <span className="text-sm text-ok">Salvo</span>}
        </div>
      </form>
    </Card>
  );
}

function useSave(id: string, fn: (body: unknown) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.profile(`own:${id}`) });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function ProfileEditor() {
  const { id = "" } = useParams();
  const { data: p, isLoading, error } = useProfile(id);
  const qc = useQueryClient();
  const submit = useMutation({ mutationFn: () => profilesService.submit(id), onSuccess: () => qc.invalidateQueries() });
  if (isLoading) return <PageLoader />;
  if (error || !p)
    return (
      <Container className="py-12">
        <ErrorBox error={error} />
      </Container>
    );
  const missing =
    submit.error instanceof ApiError ? (submit.error.details?.missing as string[] | undefined) : undefined;

  return (
    <Container className="flex max-w-3xl flex-col gap-5 py-8">
      <Link to="/conta" className="text-sm text-ink-muted">
        ← Minha conta
      </Link>
      <div>
        <Eyebrow>
          {
            {
              fighter: "Cadastro de lutador",
              coach: "Cadastro de coach",
              organizer: "Cadastro de organizador",
              provider: "Cadastro de prestador",
            }[p.type]
          }
        </Eyebrow>
        <Display className="text-4xl">{p.displayName}</Display>
      </div>
      <Basics p={p} />
      {p.type === "fighter" && <FighterSections p={p} />}
      {p.type === "coach" && <CoachSection p={p} />}
      {p.type === "organizer" && <OrganizerSection p={p} />}
      {p.type === "provider" && <ProviderSections p={p} />}
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-2xl uppercase">Enviar para aprovação</h2>
        {["draft", "rejected"].includes(p.status) ? (
          <>
            <p className="text-sm text-ink-soft">
              Depois de aprovado, seu perfil aparece na busca enquanto tiver plano ativo ou período de teste.
            </p>
            {missing && <Notice tone="hot">Falta preencher: {missing.join(", ")}.</Notice>}
            {submit.error && !missing && <ErrorBox error={submit.error} />}
            <Button size="lg" loading={submit.isPending} onClick={() => submit.mutate()}>
              Enviar perfil
            </Button>
          </>
        ) : (
          <Notice tone={p.status === "approved" ? "ok" : "gold"}>
            {p.status === "approved" ? "Perfil aprovado." : "Perfil enviado. A análise leva até 2 dias úteis."}
          </Notice>
        )}
      </Card>
    </Container>
  );
}

function Basics({ p }: { p: OwnerProfile }) {
  const { data: catalog } = useCatalog();
  const save = useSave(p.id, (b) => profilesService.update(p.id, b as Record<string, unknown>));
  const [mods, setMods] = useState<string[]>(p.modalityIds);
  const [cityId, setCityId] = useState(p.cityId ?? "");
  const city = catalog?.cities.find((c) => c.id === cityId);
  return (
    <Section
      title="Dados básicos"
      saving={save.isPending}
      error={save.error}
      saved={save.isSuccess}
      onSubmit={(f) =>
        save.mutate({
          displayName: str(f.get("displayName")),
          bio: str(f.get("bio")),
          whatsapp: str(f.get("whatsapp")),
          cityId: cityId || undefined,
          districtId: str(f.get("districtId")) ?? null,
          modalityIds: mods.length ? mods : undefined,
        })
      }
    >
      <Field label="Nome no perfil">
        <Input name="displayName" defaultValue={p.displayName} required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label="Bairro">
          <Select name="districtId" defaultValue={p.districtId ?? ""}>
            <option value="">Toda a cidade</option>
            {city?.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="WhatsApp" hint="Usado no botão “Chamar no WhatsApp”. Não aparece publicamente.">
        <Input name="whatsapp" type="tel" defaultValue={p.whatsapp ?? ""} placeholder="(21) 99999-0000" />
      </Field>
      <Field label="Sobre">
        <Textarea name="bio" defaultValue={p.bio ?? ""} maxLength={1000} />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">Modalidades</span>
        <div className="flex flex-wrap gap-2">
          {catalog?.modalities.map((m) => (
            <ToggleChip
              key={m.id}
              selected={mods.includes(m.id)}
              onClick={() => setMods((v) => (v.includes(m.id) ? v.filter((x) => x !== m.id) : [...v, m.id]))}
            >
              {m.name}
            </ToggleChip>
          ))}
        </div>
      </div>
    </Section>
  );
}

function FighterSections({ p }: { p: OwnerProfile }) {
  const { data: catalog } = useCatalog();
  const d = (p.details ?? {}) as Record<string, string | number | null | Record<string, unknown>>;
  const identity = useSave(p.id, (b) => profilesService.action(p.id, "fighter/identity", b));
  const measures = useSave(p.id, (b) => profilesService.action(p.id, "fighter/measures", b));
  const style = useSave(p.id, (b) => profilesService.action(p.id, "fighter/style", b));
  const availability = useSave(p.id, (b) => profilesService.action(p.id, "fighter/availability", b, "put"));
  const avail = (d.availability ?? {}) as {
    days?: string[];
    periods?: string[];
    radiusKm?: number;
    travelsForCamp?: boolean;
  };
  const [days, setDays] = useState<string[]>(avail.days ?? []);
  const [periods, setPeriods] = useState<string[]>(avail.periods ?? []);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const jj = catalog?.graduationSystems[0];

  return (
    <>
      <Section
        title="Identidade"
        saving={identity.isPending}
        error={identity.error}
        saved={identity.isSuccess}
        onSubmit={(f) =>
          identity.mutate({
            fullName: str(f.get("fullName")),
            fightName: str(f.get("fightName")),
            birthDate: str(f.get("birthDate")),
            sex: str(f.get("sex")),
          })
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo">
            <Input name="fullName" defaultValue={String(d.fullName ?? "")} />
          </Field>
          <Field label="Nome de luta">
            <Input name="fightName" defaultValue={String(d.fightName ?? "")} placeholder="Ex.: Trovão" />
          </Field>
          <Field label="Data de nascimento" hint="Atletas menores de 18 anos ainda não entram no piloto.">
            <Input name="birthDate" type="date" defaultValue={String(d.birthDate ?? "")} />
          </Field>
          <Field label="Sexo">
            <Select name="sex" defaultValue={String(d.sex ?? "")}>
              <option value="">Escolha</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </Select>
          </Field>
        </div>
      </Section>
      <Section
        title="Medidas"
        saving={measures.isPending}
        error={measures.error}
        saved={measures.isSuccess}
        onSubmit={(f) =>
          measures.mutate({
            heightCm: num(f.get("heightCm")),
            reachCm: num(f.get("reachCm")),
            fightWeightKg: num(f.get("fightWeightKg")),
            currentWeightKg: num(f.get("currentWeightKg")),
            weightClassId: str(f.get("weightClassId")) ?? null,
          })
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Altura (cm)">
            <Input name="heightCm" inputMode="decimal" defaultValue={String(d.heightCm ?? "")} />
          </Field>
          <Field label="Envergadura (cm)">
            <Input name="reachCm" inputMode="decimal" defaultValue={String(d.reachCm ?? "")} />
          </Field>
          <Field label="Peso de luta (kg)">
            <Input name="fightWeightKg" inputMode="decimal" defaultValue={String(d.fightWeightKg ?? "")} />
          </Field>
          <Field label="Peso atual (kg)" hint="Atualize a cada 30 dias.">
            <Input name="currentWeightKg" inputMode="decimal" defaultValue={String(d.currentWeightKg ?? "")} />
          </Field>
          <Field label="Categoria de peso" className="sm:col-span-2">
            <Select name="weightClassId" defaultValue={String(d.weightClassId ?? "")}>
              <option value="">Escolha</option>
              {catalog?.modalities.map((m) => (
                <optgroup key={m.id} label={m.name}>
                  {catalog.weightClasses
                    .filter((w) => w.modalityId === m.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.sex === "female" ? "(F)" : ""} {w.maxKg ? `até ${measure(w.maxKg)} kg` : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
      </Section>
      <Section
        title="Estilo"
        saving={style.isPending}
        error={style.error}
        saved={style.isSuccess}
        onSubmit={(f) =>
          style.mutate({
            stance: str(f.get("stance")),
            baseStyleId: str(f.get("baseStyleId")),
            levelId: str(f.get("levelId")),
            graduationId: str(f.get("graduationId")) ?? null,
          })
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Guarda">
            <Select name="stance" defaultValue={String(d.stance ?? "")}>
              <option value="">Escolha</option>
              <option value="orthodox">Destro</option>
              <option value="southpaw">Canhoto</option>
              <option value="switch">Troca a guarda</option>
            </Select>
          </Field>
          <Field label="Base">
            <Select name="baseStyleId" defaultValue={String(d.baseStyleId ?? "")}>
              <option value="">Escolha</option>
              {catalog?.fightingStyles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nível">
            <Select name="levelId" defaultValue={String(d.levelId ?? "")}>
              <option value="">Escolha</option>
              {catalog?.levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Graduação (Jiu-Jitsu)">
            <Select name="graduationId" defaultValue={String(d.graduationId ?? "")}>
              <option value="">Nenhuma</option>
              {jj?.graduations.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>
      <Photos p={p} />
      <Section
        title="Disponibilidade para sparring"
        saving={availability.isPending}
        error={availability.error}
        saved={availability.isSuccess}
        onSubmit={(f) =>
          availability.mutate({
            availability: {
              days,
              periods,
              radiusKm: num(f.get("radiusKm")),
              travelsForCamp: f.get("travels") === "on",
            },
            referencePriceCents: num(f.get("price")) != null ? Math.round(Number(f.get("price")) * 100) : null,
            referencePriceUnit: str(f.get("priceUnit")) ?? null,
          })
        }
      >
        <div className="flex flex-wrap gap-2">
          {Object.entries(DAY_LABEL).map(([k, l]) => (
            <ToggleChip key={k} selected={days.includes(k)} onClick={() => toggle(days, setDays, k)}>
              {l}
            </ToggleChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PERIOD_LABEL).map(([k, l]) => (
            <ToggleChip key={k} selected={periods.includes(k)} onClick={() => toggle(periods, setPeriods, k)}>
              {l}
            </ToggleChip>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Raio (km)">
            <Input name="radiusKm" inputMode="numeric" defaultValue={String(avail.radiusKm ?? 15)} />
          </Field>
          <Field label="Valor de referência (R$)" hint="Opcional e só informativo.">
            <Input
              name="price"
              inputMode="decimal"
              defaultValue={d.referencePriceCents ? String(Number(d.referencePriceCents) / 100) : ""}
            />
          </Field>
          <Field label="Por">
            <Select name="priceUnit" defaultValue={String(d.referencePriceUnit ?? "session")}>
              <option value="session">Sessão</option>
              <option value="camp_week">Semana de camp</option>
              <option value="hour">Hora</option>
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="travels"
            defaultChecked={avail.travelsForCamp}
            className="h-4 w-4 accent-brand"
          />{" "}
          Aceito viajar para camp
        </label>
      </Section>
    </>
  );
}

/** RF-07 / RNF-02 / RNF-03: three full-body photos with explicit consent; private bucket. */
function Photos({ p }: { p: OwnerProfile }) {
  const qc = useQueryClient();
  const [consented, setConsented] = useState(false);
  const consent = useMutation({ mutationFn: () => meService.consent("body_photos_measures", true) });
  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: "front" | "side" | "back"; file: File }) => {
      if (!consented && !consent.isSuccess) await consent.mutateAsync();
      return profilesService.uploadPhoto(p.id, kind, file);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile(`own:${p.id}`) }),
  });
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-2xl uppercase">Fotos de corpo inteiro</h2>
      <p className="text-sm text-ink-soft">
        São elas que mostram seu biotipo para quem procura sparring. Sem as três, seu perfil não aparece na busca.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(["front", "side", "back"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer flex-col gap-1">
            <PhotoFrame url={p.photos.find((x) => x.kind === k)?.url} label={k} className="aspect-[3/4] w-full" />
            <span className="text-center text-sm font-semibold">
              {{ front: "Frente", side: "Lado", back: "Costas" }[k]}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={!consented}
              onChange={(e) => e.target.files?.[0] && upload.mutate({ kind: k, file: e.target.files[0] })}
            />
          </label>
        ))}
      </div>
      <ul className="list-disc pl-5 text-sm text-ink-muted">
        <li>Roupa de treino justa: bermuda de luta ou shorts e top</li>
        <li>Corpo inteiro no quadro, da cabeça aos pés</li>
        <li>Fundo liso e boa luz; peça ajuda para fotografar</li>
      </ul>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-brand"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
        />
        Autorizo exibir minhas fotos e medidas para usuários logados da Wardraw. Posso ocultar o perfil ou apagar tudo
        quando quiser.
      </label>
      <span className="text-xs text-ink-muted">Fotos não podem ser baixadas por outros usuários.</span>
      {upload.isPending && <Notice tone="muted">Enviando foto…</Notice>}
      {upload.error && <ErrorBox error={upload.error} />}
    </Card>
  );
}

function CoachSection({ p }: { p: OwnerProfile }) {
  const d = (p.details ?? {}) as Record<string, string>;
  const save = useSave(p.id, (b) => profilesService.action(p.id, "coach", b));
  return (
    <Section
      title="Dados do coach"
      saving={save.isPending}
      error={save.error}
      saved={save.isSuccess}
      onSubmit={(f) => save.mutate({ fullName: str(f.get("fullName")), graduationText: str(f.get("graduationText")) })}
    >
      <Field label="Nome completo">
        <Input name="fullName" defaultValue={d.fullName ?? ""} />
      </Field>
      <Field label="Graduação ou certificações">
        <Input
          name="graduationText"
          defaultValue={d.graduationText ?? ""}
          placeholder="Ex.: Faixa preta de Jiu-Jitsu, CREF..."
        />
      </Field>
      <Link to="/organizador/times" className="text-sm text-brand-hot">
        Criar ou administrar meu time →
      </Link>
    </Section>
  );
}

function OrganizerSection({ p }: { p: OwnerProfile }) {
  const d = (p.details ?? {}) as Record<string, string>;
  const save = useSave(p.id, (b) => profilesService.action(p.id, "organizer", b));
  const doc = useMutation({
    mutationFn: async (file: File) => {
      const path = await profilesService.uploadPublic(p.id, "document", file);
      return profilesService.action(
        p.id,
        "verification-documents",
        { path, label: "Documento do organizador" },
        "post",
      );
    },
  });
  return (
    <Section
      title="Dados do organizador"
      saving={save.isPending}
      error={save.error}
      saved={save.isSuccess}
      onSubmit={(f) =>
        save.mutate({
          legalName: str(f.get("legalName")),
          documentType: str(f.get("documentType")),
          documentNumber: str(f.get("documentNumber")),
          responsibleName: str(f.get("responsibleName")),
          pastEventsText: str(f.get("pastEventsText")),
          defaultPaymentInstructions: str(f.get("defaultPaymentInstructions")),
        })
      }
    >
      <Field label="Nome ou razão social">
        <Input name="legalName" defaultValue={d.legalName ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field label="Documento">
          <Select name="documentType" defaultValue={d.documentType ?? "cpf"}>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
          </Select>
        </Field>
        <Field label="Número" hint="Conferido antes de publicar o primeiro evento.">
          <Input name="documentNumber" defaultValue={d.documentNumber ?? ""} inputMode="numeric" />
        </Field>
      </div>
      <Field label="Responsável">
        <Input name="responsibleName" defaultValue={d.responsibleName ?? ""} />
      </Field>
      <Field label="Eventos já realizados (opcional)">
        <Textarea name="pastEventsText" defaultValue={d.pastEventsText ?? ""} />
      </Field>
      <Field label="Instruções de pagamento das inscrições" hint="Ex.: Pix e envio do comprovante pelo WhatsApp.">
        <Textarea name="defaultPaymentInstructions" defaultValue={d.defaultPaymentInstructions ?? ""} />
      </Field>
      <Chip tone={d.verificationStatus === "verified" ? "ok" : "gold"}>
        Documento:{" "}
        {
          { unverified: "não enviado", pending: "em verificação", verified: "verificado", rejected: "recusado" }[
            d.verificationStatus ?? "unverified"
          ]
        }
      </Chip>
      {p.status !== "draft" && (
        <Field label="Comprovante do CPF/CNPJ (PDF ou foto)">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files?.[0] && doc.mutate(e.target.files[0])}
          />
        </Field>
      )}
      {doc.isSuccess && <Notice tone="ok">Documento anexado.</Notice>}
      {doc.error && <ErrorBox error={doc.error} />}
    </Section>
  );
}

type FieldValues = { values: Record<string, unknown>; verificationStatus: string } | null;
interface ProviderFieldsResponse {
  families: { id: string; name: string; fields: FieldDefinition[]; values: FieldValues }[];
  categories: { id: string; name: string; fields: FieldDefinition[]; values: FieldValues }[];
}

/** Provider in 3 layers: family → categories (limit from the plan) → dynamic fields defined by the admin. */
function ProviderSections({ p }: { p: OwnerProfile }) {
  const { data: catalog } = useCatalog();
  const qc = useQueryClient();
  const fieldsQuery = useQuery({
    queryKey: ["providerFields", p.id, "get"],
    queryFn: () => get<ProviderFieldsResponse>(`/me/profiles/${p.id}/provider/fields`),
  });
  const [familyId, setFamilyId] = useState<string>(catalog?.serviceFamilies[0]?.id ?? "");
  const family = catalog?.serviceFamilies.find((f) => f.id === familyId) ?? catalog?.serviceFamilies[0];
  const [selected, setSelected] = useState<string[]>([]);
  const cats = useMutation({
    mutationFn: () => profilesService.action(p.id, "provider/categories", { categoryIds: selected }, "put"),
    onSuccess: () => (
      qc.invalidateQueries({ queryKey: ["providerFields", p.id, "get"] }),
      qc.invalidateQueries({ queryKey: keys.profile(`own:${p.id}`) })
    ),
  });
  const limit = (p.features["provider.max_categories"] as number | null | undefined) ?? 1;

  return (
    <>
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-2xl uppercase">Sua área</h2>
        <span className="text-sm font-semibold text-ink-soft">1 · Família</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {catalog?.serviceFamilies.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilyId(f.id)}
              className={`flex flex-col rounded-xl border p-3 text-left ${family?.id === f.id ? "border-brand-hot bg-brand-deep" : "border-line bg-surface-2"}`}
            >
              <span className="font-bold">{f.name}</span>
              <span className="text-xs text-ink-muted">{f.description}</span>
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-ink-soft">2 · Categoria</span>
        <div className="flex flex-wrap gap-2">
          {family?.categories.map((c) => (
            <ToggleChip
              key={c.id}
              selected={selected.includes(c.id)}
              onClick={() => setSelected((v) => (v.includes(c.id) ? v.filter((x) => x !== c.id) : [...v, c.id]))}
            >
              {c.name}
            </ToggleChip>
          ))}
        </div>
        <span className="text-xs text-ink-muted">
          Até {limit ?? "ilimitadas"} categoria(s) no seu plano. Até 3 categorias a partir do plano Pro.
        </span>
        {cats.error && <ErrorBox error={cats.error} />}
        <Button disabled={!selected.length} loading={cats.isPending} onClick={() => cats.mutate()}>
          Salvar categorias
        </Button>
      </Card>
      {fieldsQuery.data?.families.map((f) => (
        <DynamicFields
          key={f.id}
          profileId={p.id}
          title={`Dados de ${f.name}`}
          target={{ familyId: f.id }}
          fields={f.fields}
          values={f.values}
        />
      ))}
      {fieldsQuery.data?.categories.map((c) => (
        <DynamicFields
          key={c.id}
          profileId={p.id}
          title={`3 · Dados de ${c.name}`}
          target={{ categoryId: c.id }}
          fields={c.fields}
          values={c.values}
        />
      ))}
      <Portfolio p={p} />
    </>
  );
}

function DynamicFields({
  profileId,
  title,
  target,
  fields,
  values,
}: {
  profileId: string;
  title: string;
  target: { familyId?: string; categoryId?: string };
  fields: FieldDefinition[];
  values: { values: Record<string, unknown>; verificationStatus: string } | null;
}) {
  const save = useSave(profileId, (b) => profilesService.action(profileId, "provider/fields", b, "put"));
  const [multi, setMulti] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      fields.filter((f) => f.type === "multiselect").map((f) => [f.key, (values?.values[f.key] as string[]) ?? []]),
    ),
  );
  if (!fields.length) return null;
  const errors =
    save.error instanceof ApiError ? (save.error.details?.errors as Record<string, string> | undefined) : undefined;
  return (
    <Section
      title={title}
      saving={save.isPending}
      error={errors ? null : save.error}
      saved={save.isSuccess}
      onSubmit={(f) => {
        const out: Record<string, unknown> = {};
        fields.forEach((d) => {
          if (d.type === "multiselect") out[d.key] = multi[d.key];
          else if (d.type === "boolean") out[d.key] = f.get(d.key) === "on";
          else if (d.type === "number") out[d.key] = num(f.get(d.key));
          else out[d.key] = str(f.get(d.key));
        });
        save.mutate({ ...target, values: out });
      }}
    >
      {values?.verificationStatus === "pending" && (
        <Notice>
          Seu registro é conferido antes de o perfil aparecer na busca. Normalmente leva até 2 dias úteis.
        </Notice>
      )}
      {values?.verificationStatus === "verified" && <Chip tone="ok">Verificado</Chip>}
      {fields.map((d) => (
        <Field
          key={d.key}
          label={`${d.label}${d.required ? " *" : ""}`}
          hint={d.helpText ?? undefined}
          error={errors?.[d.key]}
        >
          {d.type === "select" ? (
            <Select name={d.key} defaultValue={String(values?.values[d.key] ?? "")}>
              <option value="">Escolha</option>
              {d.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          ) : d.type === "multiselect" ? (
            <div className="flex flex-wrap gap-2">
              {d.options.map((o) => (
                <ToggleChip
                  key={o}
                  selected={multi[d.key]?.includes(o)}
                  onClick={() =>
                    setMulti((m) => ({
                      ...m,
                      [d.key]: m[d.key]?.includes(o) ? m[d.key].filter((x) => x !== o) : [...(m[d.key] ?? []), o],
                    }))
                  }
                >
                  {o}
                </ToggleChip>
              ))}
            </div>
          ) : d.type === "boolean" ? (
            <input
              type="checkbox"
              name={d.key}
              defaultChecked={!!values?.values[d.key]}
              className="h-5 w-5 accent-brand"
            />
          ) : d.type === "textarea" ? (
            <Textarea name={d.key} defaultValue={String(values?.values[d.key] ?? "")} />
          ) : (
            <Input
              name={d.key}
              type={d.type === "number" ? "number" : d.type === "date" ? "date" : d.type === "url" ? "url" : "text"}
              defaultValue={String(values?.values[d.key] ?? "")}
            />
          )}
        </Field>
      ))}
    </Section>
  );
}

function Portfolio({ p }: { p: OwnerProfile }) {
  const add = useMutation({
    mutationFn: async (file: File) => {
      const path = await profilesService.uploadPublic(p.id, "portfolio", file);
      return profilesService.action(p.id, "provider/portfolio", { kind: "photo", storagePath: path }, "post");
    },
  });
  const link = useMutation({
    mutationFn: (url: string) => profilesService.action(p.id, "provider/portfolio", { kind: "video", url }, "post"),
  });
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-2xl uppercase">Portfólio</h2>
      <p className="text-sm text-ink-soft">
        Fotos do seu trabalho. Mídia precisa de pelo menos 6 trabalhos para a revisão.
      </p>
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && add.mutate(e.target.files[0])} />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = new FormData(e.currentTarget).get("url");
          if (url) link.mutate(String(url));
        }}
      >
        <Input name="url" type="url" placeholder="Link de vídeo (planos Pro e Destaque)" />
        <Button type="submit" variant="secondary" loading={link.isPending}>
          Adicionar
        </Button>
      </form>
      {(add.isSuccess || link.isSuccess) && <Notice tone="ok">Item adicionado ao portfólio.</Notice>}
      {(add.error || link.error) && <ErrorBox error={add.error ?? link.error} />}
    </Card>
  );
}
