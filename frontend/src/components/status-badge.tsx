import { statusLabel } from '../lib/format';

const statusClassMap: Record<string, string> = {
  offen: 'badge badge-neutral',
  gelesen: 'badge badge-info',
  freigegeben: 'badge badge-success',
  ueberarbeitet_noetig: 'badge badge-warning',
  eskaliert: 'badge badge-danger',
  ueberfaellig: 'badge badge-danger',
  in_pruefung: 'badge badge-accent',
  abgeschlossen: 'badge badge-success',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={statusClassMap[status] ?? 'badge badge-neutral'}>{statusLabel(status)}</span>;
}
