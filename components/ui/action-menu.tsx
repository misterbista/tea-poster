"use client";

import { Menu } from "@base-ui/react/menu";
import { MoreHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ActionMenu({ label, actions }: {
  label: string;
  actions: { label: string; icon?: ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean }[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted">
        <MoreHorizontalIcon className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="max-h-[var(--available-height)] min-w-44 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            {actions.map((action) => (
              <Menu.Item key={action.label} disabled={action.disabled} onClick={action.onClick} className={`flex min-h-11 cursor-default items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-35 [&_svg]:size-4 ${action.destructive ? "text-destructive" : ""}`}>
                {action.icon}{action.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
