import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Chip, Display, ErrorBox, PageLoader, Textarea } from "@/components/shared/ui";
import { keys, useAdminMutation } from "@/infra/hooks/queries";
import { adminService } from "@/infra/services/admin.service";

/** System parameters (app_settings). Each value is validated by the API against the JSON schema stored with it. */
export function SettingsView() {
  const { data, isLoading, error } = useQuery({ queryKey: keys.admin.settings, queryFn: adminService.settings });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorBox error={error} />;
  const groups = [...new Set(data?.map((s) => s.category))];
  return (
    <div className="flex flex-col gap-5">
      <Display className="text-3xl">Parâmetros</Display>
      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className="font-cond text-lg font-semibold uppercase tracking-wide text-ink-muted">{g}</h2>
          {data
            ?.filter((s) => s.category === g)
            .map((s) => (
              <SettingRow key={s.key} s={s} />
            ))}
        </section>
      ))}
    </div>
  );
}

function SettingRow({ s }: { s: { key: string; value: unknown; description: string } }) {
  const [text, setText] = useState(JSON.stringify(s.value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const save = useAdminMutation((value: unknown) => adminService.updateSetting(s.key, value));
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold">{s.key}</span>
        {save.isSuccess && <Chip tone="ok">Salvo</Chip>}
      </div>
      <p className="text-sm text-ink-soft">{s.description}</p>
      <Textarea
        className="font-mono text-xs"
        rows={Math.min(8, text.split("\n").length + 1)}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {parseError && <ErrorBox error={new Error(parseError)} />}
      {save.error && <ErrorBox error={save.error} />}
      <Button
        size="sm"
        className="self-start"
        loading={save.isPending}
        onClick={() => {
          try {
            setParseError(null);
            save.mutate(JSON.parse(text));
          } catch {
            setParseError("JSON inválido.");
          }
        }}
      >
        Salvar
      </Button>
    </Card>
  );
}
