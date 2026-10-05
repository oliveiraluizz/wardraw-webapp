import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Card,
  Display,
  ErrorBox,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  Textarea,
  ToggleChip,
} from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService, type ResourceField, type ResourceMeta } from "@/infra/services/admin.service";

type Row = Record<string, unknown> & { id?: string };

/** Generic, metadata-driven CRUD: every configurable table without hardcoded forms. */
export function ResourcesView({ only }: { only?: string[] }) {
  const {
    data: resources,
    isLoading,
    error,
  } = useQuery({ queryKey: keys.admin.resources, queryFn: adminService.resources });
  const list = (resources ?? []).filter((r) => !only || only.includes(r.name));
  const [name, setName] = useState<string>("");
  const current = list.find((r) => r.name === name) ?? list[0];
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorBox error={error} />;
  return (
    <div className="flex flex-col gap-5">
      {!only && <Display className="text-3xl">Cadastros e catálogos</Display>}
      <div className="flex flex-wrap gap-2">
        {list.map((r) => (
          <ToggleChip key={r.name} selected={current?.name === r.name} onClick={() => setName(r.name)}>
            {r.label}
          </ToggleChip>
        ))}
      </div>
      {current && <ResourceTable key={current.name} meta={current} />}
    </div>
  );
}

const LABEL_FIELDS = ["name", "label", "code", "key", "text", "reason", "title"];
const HIDE = ["createdAt", "updatedAt", "deletedAt", "id"];

export function ResourceTable({
  meta,
  filters,
  compactColumns,
}: {
  meta: ResourceMeta;
  filters?: Record<string, string>;
  compactColumns?: string[];
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const params = { q: q || undefined, page, limit: 50, ...filters };
  const { data, isLoading, error } = useQuery({
    queryKey: keys.admin.list(meta.name, params),
    queryFn: () => adminService.list(meta.name, params),
  });
  const remove = useAdminMutation((id: string) => adminService.remove(meta.name, id));
  const pk = meta.fields.find((f) => f.primaryKey)?.field ?? "id";
  const cols =
    compactColumns ??
    meta.fields
      .filter((f) => !HIDE.includes(f.field) && f.kind !== "json")
      .slice(0, 6)
      .map((f) => f.field);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl uppercase">{meta.label}</h2>
        <div className="flex-1" />
        <Input
          className="h-10 w-60"
          placeholder="Buscar"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPage(1))}
        />
        <Button size="sm" onClick={() => setEditing({ ...filters })}>
          Novo
        </Button>
      </div>
      {error && <ErrorBox error={error} />}
      {remove.error && <ErrorBox error={remove.error} />}
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-2 py-2 font-semibold">
                    {c}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.data.map((r) => (
                <tr key={String(r[pk])} className="border-t border-line">
                  {cols.map((c) => (
                    <td key={c} className="max-w-[260px] truncate px-2 py-2">
                      {display(r[c])}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirm("Remover este registro?") && remove.mutate(String(r[pk]))}
                    >
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-ink-muted">
            {page} / {data.pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
      {editing && <RecordForm meta={meta} row={editing} pk={pk} onClose={() => setEditing(null)} />}
    </Card>
  );
}

const display = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Builds inputs from column metadata (type, enum, nullable); references to other tables are picked from their lists. */
function RecordForm({ meta, row, pk, onClose }: { meta: ResourceMeta; row: Row; pk: string; onClose: () => void }) {
  const isNew = !row[pk];
  const writable = meta.fields.filter((f) => f.writable || (isNew && f.primaryKey && !f.hasDefault));
  const save = useAdminMutation((body: Row) =>
    isNew ? adminService.create(meta.name, body) : adminService.update(meta.name, String(row[pk]), body),
  );
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(writable.map((f) => [f.field, row[f.field] ?? null])),
  );

  const submit = () => {
    const body: Row = {};
    writable.forEach((f) => {
      const v = values[f.field];
      if (isNew && (v === null || v === "") && (f.hasDefault || f.nullable)) return;
      if (!isNew && JSON.stringify(v) === JSON.stringify(row[f.field])) return;
      body[f.field] = v === "" && f.nullable ? null : v;
    });
    save.mutate(body, { onSuccess: onClose });
  };

  return (
    <Modal open onClose={onClose} title={`${isNew ? "Novo" : "Editar"} · ${meta.label}`} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {writable.map((f) => (
          <FieldInput
            key={f.field}
            f={f}
            value={values[f.field]}
            onChange={(v) => setValues((s) => ({ ...s, [f.field]: v }))}
          />
        ))}
      </div>
      {save.error && (
        <div className="mt-3">
          <ErrorBox error={save.error} />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button loading={save.isPending} onClick={submit}>
          Salvar
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}

function ReferenceSelect({
  table,
  value,
  onChange,
  nullable,
}: {
  table: string;
  value: unknown;
  onChange: (v: unknown) => void;
  nullable: boolean;
}) {
  const name = table.replace(/_/g, "-");
  const { data } = useQuery({
    queryKey: keys.admin.list(name, { limit: 200 }),
    queryFn: () => adminService.list(name, { limit: 200 }),
    retry: false,
  });
  if (!data)
    return <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)} placeholder="ID" />;
  return (
    <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{nullable ? "— nenhum —" : "Escolha"}</option>
      {data.data.map((r) => {
        const label = LABEL_FIELDS.map((k) => r[k]).find((x) => typeof x === "string") as string | undefined;
        const id = String(r.id ?? r.code);
        return (
          <option key={id} value={id}>
            {label ?? id}
          </option>
        );
      })}
    </Select>
  );
}

function FieldInput({ f, value, onChange }: { f: ResourceField; value: unknown; onChange: (v: unknown) => void }) {
  const label = `${f.field}${!f.nullable && !f.hasDefault ? " *" : ""}`;
  if (f.references && f.references !== "users")
    return (
      <Field label={label}>
        <ReferenceSelect table={f.references} value={value} onChange={onChange} nullable={f.nullable} />
      </Field>
    );
  if (f.enum)
    return (
      <Field label={label}>
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {f.enum.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
    );
  if (f.kind === "boolean")
    return (
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />{" "}
        {f.field}
      </label>
    );
  if (f.kind === "json" || f.kind === "string[]")
    return (
      <Field label={`${label} (JSON)`} className="sm:col-span-2">
        <Textarea
          className="font-mono text-xs"
          defaultValue={value === null || value === undefined ? "" : JSON.stringify(value, null, 2)}
          onBlur={(e) => {
            try {
              onChange(e.target.value.trim() ? JSON.parse(e.target.value) : null);
            } catch {
              /* keep last valid value; the API validates on save */
            }
          }}
        />
      </Field>
    );
  const type =
    f.kind === "integer" || f.kind === "number"
      ? "number"
      : f.kind === "date"
        ? "date"
        : f.kind === "datetime"
          ? "datetime-local"
          : "text";
  const shown = f.kind === "datetime" && typeof value === "string" ? value.slice(0, 16) : String(value ?? "");
  return (
    <Field label={label}>
      <Input
        type={type}
        step="any"
        value={shown}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          if (type === "number") return onChange(Number(raw));
          if (f.kind === "datetime") return onChange(new Date(raw).toISOString());
          onChange(raw);
        }}
      />
    </Field>
  );
}
