import type { BlockedTime } from '@/types';

interface Props {
  block: BlockedTime;
  slotHeight: number;
}

export default function BlockedTimeCell({ block, slotHeight }: Props) {
  const heightSlots = block.blocked_hours * 2;
  const height = heightSlots * slotHeight;

  return (
    <div className="blocked-cell" style={{ height }}>
      {block.comments || 'Заблоковано'}
    </div>
  );
}
