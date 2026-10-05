import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-hot",
  {
    variants: {
      variant: {
        primary: "border border-brand bg-brand text-white hover:bg-[#a90d27]",
        secondary: "border border-line bg-surface-2 text-white hover:bg-surface-3",
        ghost: "text-ink hover:bg-surface",
        outline: "border border-line bg-surface text-ink hover:bg-surface-2",
        success: "border border-ok-edge bg-ok-bg text-ok hover:brightness-110",
      },
      size: { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-[22px] text-[15px]", lg: "min-h-12 px-6 text-base" },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export const ButtonLink = ({
  className,
  variant,
  size,
  block,
  ...props
}: LinkProps & VariantProps<typeof buttonVariants>) => (
  <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
);

export const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold",
  {
    variants: {
      tone: { muted: "text-ink-muted", ink: "text-ink", hot: "text-brand-hot", gold: "text-gold", ok: "text-ok" },
    },
    defaultVariants: { tone: "muted" },
  },
);

export const Chip = ({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chipVariants>) => (
  <span className={cn(chipVariants({ tone }), className)} {...props} />
);

/** Selectable pill used in filters ("Destro | Canhoto", modalities, periods). */
export const ToggleChip = ({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
      selected
        ? "border-brand-hot bg-brand-deep text-brand-hot"
        : "border-line bg-surface text-ink-soft hover:bg-surface-2",
      className,
    )}
    {...props}
  />
);

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-card border border-line bg-surface p-4", className)} {...props} />
);

export const Eyebrow = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("font-cond text-[13px] font-semibold uppercase tracking-[1.2px] text-ink-muted", className)}
    {...props}
  />
);

export const Display = ({
  className,
  as: Tag = "h1",
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" }) => (
  <Tag className={cn("m-0 font-display font-normal uppercase leading-[1.05]", className)} {...props} />
);

export const Stat = ({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <span className="font-cond text-xl font-bold text-ink">{value ?? "—"}</span>
    <span className="text-xs text-ink-muted">{label}</span>
  </div>
);

export const SimilarityBadge = ({ percent, label = "parecido" }: { percent: number; label?: string }) => (
  <div className="flex flex-col items-center rounded-[10px] border border-gold-edge bg-gold-bg px-2 py-1">
    <span className="font-cond text-[22px] font-bold leading-none text-gold">{percent}%</span>
    <span className="text-[10px] font-bold uppercase text-gold">{label}</span>
  </div>
);

export const Avatar = ({
  name,
  url,
  size = 44,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) =>
  url ? (
    <img
      src={url}
      alt=""
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-cond font-bold text-ink-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );

/** Body photo frame; real photos are signed URLs, otherwise a silhouette placeholder. */
export const PhotoFrame = ({ url, label, className }: { url?: string | null; label: string; className?: string }) => (
  <div
    role="img"
    aria-label={label}
    className={cn(
      "relative flex items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-surface-3 to-[#1B1B1F]",
      className,
    )}
  >
    {url ? (
      <img
        src={url}
        alt=""
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full select-none object-cover"
      />
    ) : (
      <svg viewBox="0 0 40 80" className="h-4/5 text-line" fill="currentColor" aria-hidden>
        <circle cx="20" cy="10" r="7" />
        <path d="M8 22h24l-3 26h-4l-2 30h-6l-2-30h-4z" />
      </svg>
    )}
  </div>
);

const fieldBase =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-brand-hot focus:outline-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-11 appearance-none pr-8", className)} {...props} />
  ),
);
Select.displayName = "Select";

export const Field = ({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) => (
  <label className={cn("flex flex-col gap-1.5", className)}>
    <span className="text-sm font-semibold text-ink-soft">{label}</span>
    {children}
    {hint && !error && <span className="text-xs text-ink-muted">{hint}</span>}
    {error && <span className="text-xs text-brand-hot">{error}</span>}
  </label>
);

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn("h-6 w-6 animate-spin text-ink-muted", className)} aria-label="Carregando" />
);

export const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spinner />
  </div>
);

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-6 py-10 text-center">
    <p className="font-display text-xl uppercase">{title}</p>
    {children && <div className="max-w-md text-sm text-ink-muted">{children}</div>}
  </div>
);

export const ErrorBox = ({ error }: { error: unknown }) => (
  <div role="alert" className="rounded-xl border border-brand-edge bg-brand-deep px-4 py-3 text-sm text-ink-soft">
    {error instanceof Error ? error.message : "Algo deu errado."}
  </div>
);

export const Notice = ({
  tone = "gold",
  children,
  className,
}: {
  tone?: "gold" | "ok" | "hot" | "muted";
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-xl border px-4 py-3 text-sm",
      tone === "gold" && "border-gold-edge bg-gold-bg text-gold-text",
      tone === "ok" && "border-ok-edge bg-ok-bg text-ok",
      tone === "hot" && "border-brand-edge bg-brand-deep text-ink-soft",
      tone === "muted" && "border-line bg-surface text-ink-muted",
      className,
    )}
  >
    {children}
  </div>
);

export const Modal = ({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) =>
  open ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-ink-muted hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  ) : null;

export const Logo = ({ className }: { className?: string }) => (
  <Link
    to="/"
    className={cn("font-display text-[28px] tracking-[1px] text-ink", className)}
    aria-label="Wardraw, início"
  >
    WAR<span className="text-brand-hot">DRAW</span>
  </Link>
);
