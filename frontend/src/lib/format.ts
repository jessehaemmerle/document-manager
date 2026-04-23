export function formatDate(value?: string | null) {
  if (!value) return 'Nicht gesetzt';
  return new Intl.DateTimeFormat('de-AT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace('ueberarbeitet noetig', 'Überarbeitung nötig')
    .replace('in pruefung', 'In Prüfung')
    .replace('ueberfaellig', 'Überfällig')
    .replace('eskaliert', 'Eskaliert')
    .replace('freigegeben', 'Freigegeben')
    .replace('offen', 'Offen')
    .replace('gelesen', 'Gelesen')
    .replace('abgeschlossen', 'Abgeschlossen');
}
