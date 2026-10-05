import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/SiteLayout";
import { ProviderCard } from "@/components/flows/cards";
import { Display, EmptyState, ErrorBox, Notice, PageLoader, Select, ToggleChip } from "@/components/shared/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog, useProviderSearch } from "@/infra/hooks/queries";
import { useActiveProfile } from "@/infra/hooks/useActiveProfile";
import { searchService } from "@/infra/services/search.service";

export default function ServicesPage() {
  const { data: catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const { session } = useAuth();
  const { profile } = useActiveProfile();
  const navigate = useNavigate();
  const cityId = params.get("cidade") ?? catalog?.cities[0]?.id ?? "";
  const categoryId = params.get("categoria") ?? "";
  const modalityId = params.get("modalidade") ?? "";
  const fieldFilters = Object.fromEntries(
    [...params.entries()].filter(([k]) => k.startsWith("f_")).map(([k, v]) => [k.slice(2), v === "true" ? true : v]),
  );

  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  const categories = useMemo(
    () => catalog?.serviceFamilies.flatMap((f) => f.categories.map((c) => ({ ...c, family: f }))) ?? [],
    [catalog],
  );
  const category = categories.find((c) => c.id === categoryId);
  const filterableFields = category ? [...category.family.fields, ...category.fields].filter((f) => f.filterable) : [];

  const { data: counts } = useQuery({
    queryKey: ["providerCounts", cityId],
    queryFn: () => searchService.providerCounts(cityId || undefined),
    enabled: !!catalog,
  });
  const { data, isLoading, error } = useProviderSearch({
    cityId: cityId || undefined,
    categoryId: categoryId || undefined,
    modalityId: modalityId || undefined,
    fields: Object.keys(fieldFilters).length ? fieldFilters : undefined,
  });
  const whatsapp = useMutation({
    mutationFn: (toProfileId: string) =>
      searchService.whatsapp({ fromProfileId: profile!.id, toProfileId, context: "service_search" }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
  });
  const cityName = catalog?.cities.find((c) => c.id === cityId)?.name ?? "";
  const count = (id: string) => counts?.find((c) => c.id === id)?.providers ?? 0;

  return (
    <Container className="flex flex-col gap-6 py-8">
      <nav className="text-sm text-ink-muted" aria-label="Trilha">
        <Link to="/">Início</Link> / Serviços
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Display className="text-4xl lg:text-5xl">Monte o time do seu camp</Display>
        <Select className="w-60" value={cityId} onChange={(e) => set("cidade", e.target.value)} aria-label="Cidade">
          {catalog?.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <ToggleChip selected={!categoryId} onClick={() => set("categoria")}>
          Todas
        </ToggleChip>
        {categories.map((c) => (
          <ToggleChip key={c.id} selected={categoryId === c.id} onClick={() => set("categoria", c.id)}>
            {c.name} <span className="ml-1 text-ink-muted">{count(c.id)}</span>
          </ToggleChip>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl uppercase">
          {data?.total ?? 0}{" "}
          {category
            ? `${category.professionalTitle.toLowerCase()}${(data?.total ?? 0) === 1 ? "" : "s"}`
            : "prestadores"}{" "}
          {cityName && `em ${cityName}`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {catalog?.modalities.map((m) => (
            <ToggleChip
              key={m.id}
              selected={modalityId === m.id}
              onClick={() => set("modalidade", modalityId === m.id ? undefined : m.id)}
            >
              {m.name}
            </ToggleChip>
          ))}
          {filterableFields.flatMap((f) =>
            f.type === "boolean"
              ? [
                  <ToggleChip
                    key={f.key}
                    selected={params.get(`f_${f.key}`) === "true"}
                    onClick={() => set(`f_${f.key}`, params.get(`f_${f.key}`) ? undefined : "true")}
                  >
                    {f.label}
                  </ToggleChip>,
                ]
              : f.options.map((o) => (
                  <ToggleChip
                    key={`${f.key}${o}`}
                    selected={params.get(`f_${f.key}`) === o}
                    onClick={() => set(`f_${f.key}`, params.get(`f_${f.key}`) === o ? undefined : o)}
                  >
                    {o}
                  </ToggleChip>
                )),
          )}
        </div>
      </div>
      {!session && (
        <Notice tone="muted">
          Você vê os cards dos prestadores. Para ver o perfil completo e chamar no WhatsApp, entre na sua conta.
        </Notice>
      )}
      {error && <ErrorBox error={error} />}
      {whatsapp.error && <ErrorBox error={whatsapp.error} />}
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.results.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onWhatsapp={() => (session && profile ? whatsapp.mutate(p.id) : navigate(`/entrar?next=/servicos`))}
            />
          ))}
        </div>
      )}
      {data && !data.results.length && (
        <EmptyState title="Ninguém por aqui ainda">
          Ainda não há prestadores verificados nessa categoria e cidade.
        </EmptyState>
      )}
    </Container>
  );
}
