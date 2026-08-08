import { cn } from "@/lib/utils";
import BorderGlow from "@/components/ui/border-glow";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  colSpan?: number;
  visual?: React.ReactNode;
}

interface BentoGridProps {
  items: BentoItem[];
}

export function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <BorderGlow
          key={index}
          className={cn(
            "group",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
          )}
          edgeSensitivity={30}
          glowColor="152 100 45"
          backgroundColor="#0a1828"
          borderRadius={12}
          glowRadius={28}
          glowIntensity={1.0}
          coneSpread={25}
          animated={false}
          colors={["#00e478", "#38bdf8", "#5227FF"]}
          fillOpacity={0.35}
        >
          <div className="relative flex h-full flex-col space-y-3 p-5 transition-transform duration-300 group-hover:-translate-y-0.5">
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
            {item.visual && (
              <div className="pt-1">
                {item.visual}
              </div>
            )}
          </div>
        </BorderGlow>
      ))}
    </div>
  );
}
