import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  colSpan?: number;
}

interface BentoGridProps {
  items: BentoItem[];
}

export function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "group relative overflow-hidden rounded-xl border p-5 transition-all duration-300",
            "border-[rgba(255,255,255,0.08)] bg-[#0a1828]",
            "hover:-translate-y-0.5 will-change-transform",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
          )}
        >
          <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "4px 4px",
              }}
            />
          </div>

          <div className="relative flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition-all duration-300 group-hover:bg-white/10">
                {item.icon}
              </div>
              {item.status && (
                <span className="rounded-lg bg-white/5 px-2 py-1 text-xs font-medium text-[#b9cbb9] backdrop-blur-sm transition-colors duration-300 group-hover:bg-white/10">
                  {item.status}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight text-[#d6e4f9]">
                {item.title}
              </h3>
              <p className="text-sm leading-snug text-[#b9cbb9]">
                {item.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
