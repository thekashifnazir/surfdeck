import type { ReactNode } from "react";

export interface CardSlotProps {
  /** Whether the card should be visible (printed out) */
  visible: boolean;
  /** Whether the card is reprinting (duck up then return with new data) */
  reprint: boolean;
  children: ReactNode;
}

/**
 * CardSlot — the physical slot under the Telly from which
 * the provenance card prints down. Manages the print/reprint animation
 * via CSS classes.
 */
export default function CardSlot({ visible, reprint, children }: CardSlotProps) {
  let slotClass = "card-slot";
  if (reprint) {
    slotClass += " card-slot--reprint";
  } else if (visible) {
    slotClass += " card-slot--visible";
  }

  return (
    <div className={slotClass} aria-label="Provenance card slot">
      <div className="card-slot__inner">
        {children}
      </div>
    </div>
  );
}
