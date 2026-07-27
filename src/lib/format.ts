const frFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const enFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dateFr = (d: string) => frFmt.format(new Date(d + 'T12:00:00'));
export const dateEn = (d: string) => enFmt.format(new Date(d + 'T12:00:00'));
