import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/infra/api/client";
import { useActiveProfile } from "@/infra/hooks/useActiveProfile";
import { searchService } from "@/infra/services/search.service";
import { Button, ErrorBox, Field, Modal, Notice, Select, Textarea } from "../shared/ui";

/** RF-28 WhatsApp with the configured message (counts against the plan quota) + RF-39 report. */
export function ContactActions({
  targetId,
  targetType,
  context = "profile",
  compare,
}: {
  targetId: string;
  targetType: string;
  context?: string;
  compare?: boolean;
}) {
  const { profile } = useActiveProfile();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const whatsapp = useMutation({
    mutationFn: () => searchService.whatsapp({ fromProfileId: profile!.id, toProfileId: targetId, context }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
  });
  const report = useMutation({
    mutationFn: (b: { reason: string; details: string }) =>
      searchService.report({ subjectType: "profile", subjectId: targetId, ...b }),
  });
  const upgrade = whatsapp.error instanceof ApiError && whatsapp.error.needsUpgrade;

  if (!profile)
    return (
      <Notice tone="muted">
        Crie um perfil para entrar em contato.{" "}
        <Link to="/conta/perfis/novo" className="font-bold text-brand-hot">
          Criar perfil
        </Link>
      </Notice>
    );

  return (
    <div className="flex flex-col gap-2">
      <Button variant="success" size="lg" loading={whatsapp.isPending} onClick={() => whatsapp.mutate()}>
        Chamar no WhatsApp
      </Button>
      {compare && targetType === "fighter" && (
        <Button variant="secondary" size="lg" onClick={() => navigate(`/comparar?b=${targetId}`)}>
          Comparar comigo
        </Button>
      )}
      {upgrade ? (
        <Notice>
          {(whatsapp.error as ApiError).message}{" "}
          <Link to="/planos" className="font-bold underline">
            Ver planos
          </Link>
        </Notice>
      ) : (
        whatsapp.error && <ErrorBox error={whatsapp.error} />
      )}
      <button
        type="button"
        className="self-start text-sm text-ink-muted underline hover:text-ink"
        onClick={() => setReportOpen(true)}
      >
        Denunciar perfil
      </button>
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Denunciar perfil">
        {report.isSuccess ? (
          <Notice tone="ok">Recebemos sua denúncia. A moderação vai analisar.</Notice>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              report.mutate({ reason: String(f.get("reason")), details: String(f.get("details") ?? "") });
            }}
          >
            <Field label="Motivo">
              <Select name="reason" required>
                <option value="fake_profile">Perfil falso</option>
                <option value="inappropriate_content">Conteúdo impróprio</option>
                <option value="harassment">Assédio</option>
                <option value="minor">Menor de idade</option>
                <option value="spam">Spam</option>
                <option value="other">Outro</option>
              </Select>
            </Field>
            <Field label="Detalhes (opcional)">
              <Textarea name="details" maxLength={1000} />
            </Field>
            {report.error && <ErrorBox error={report.error} />}
            <Button type="submit" loading={report.isPending}>
              Enviar denúncia
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
